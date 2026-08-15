import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ActionItemStatus, MeetingStatus } from '@prisma/client';
import { ALLOWED_UPLOAD_MIME, MAX_UPLOAD_BYTES, type CreateCommentRequest, type CreateMeetingRequest, type CreateShareLinkRequest, type ImportMeetingRequest, type SharedMeetingView } from '@ama/shared-types';
import { ForbiddenError, NotFoundError, ValidationError } from '../../common/errors';
import { env } from '../../config/env';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { IStorage, STORAGE } from '../../infrastructure/storage/storage.types';
import { UsageService } from '../billing/usage.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { toMeetingDto } from './meetings.dto';

const MAX_IMPORT_BYTES = 100 * 1024 * 1024; // 100 MB
const IMPORT_TIMEOUT_MS = 60_000;

@Injectable()
export class MeetingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaces: WorkspacesService,
    private readonly usage: UsageService,
    @Inject(STORAGE) private readonly storage: IStorage,
    private readonly queue: QueueService,
  ) {}

  /** Create a meeting and hand back a presigned URL for direct-to-storage upload. */
  async createUpload(input: CreateMeetingRequest, userId: string) {
    this.validateFile(input.mimeType, input.sizeBytes);

    const workspace = await this.workspaces.getActiveForUser(userId);
    await this.usage.assertCanUpload(workspace);

    const meeting = await this.prisma.meeting.create({
      data: {
        workspaceId: workspace.id,
        title: input.title,
        ownerId: userId,
        sourceType: 'UPLOAD',
        status: 'QUEUED',
        occurredAt: new Date(),
      },
    });

    const storageKey = `meetings/${meeting.id}/original`;
    await this.prisma.meetingMedia.create({
      data: {
        meetingId: meeting.id,
        originalStorageKey: storageKey,
        mimeType: input.mimeType,
        sizeBytes: BigInt(input.sizeBytes),
      },
    });

    const uploadUrl = await this.storage.getPresignedPutUrl(storageKey, input.mimeType);
    return { id: meeting.id, uploadUrl };
  }

  /** Confirm the upload landed and enqueue the processing pipeline. */
  async completeUpload(meetingId: string, userId: string) {
    const meeting = await this.getForUser(meetingId, userId);
    await this.usage.incrementMeetings(meeting.workspaceId);
    await this.queue.enqueueMeetingProcessing(meetingId);
    return toMeetingDto(meeting);
  }

  /**
   * Import a recording from a URL (Zoom/Meet share link, direct media URL):
   * download server-side (capped), store via the storage provider, run the normal
   * pipeline. Same quota rules as a manual upload.
   */
  async importFromUrl(input: ImportMeetingRequest, userId: string) {
    const workspace = await this.workspaces.getActiveForUser(userId);
    await this.usage.assertCanUpload(workspace);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), IMPORT_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(input.url, { signal: controller.signal, redirect: 'follow' });
    } catch (error) {
      throw new ValidationError(
        error instanceof Error && error.name === 'AbortError'
          ? 'Download timed out after 60 seconds.'
          : 'Could not reach that URL.',
      );
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) {
      throw new ValidationError(`The URL returned HTTP ${response.status}.`);
    }

    const declaredSize = Number(response.headers.get('content-length') ?? 0);
    if (declaredSize > MAX_IMPORT_BYTES) {
      throw new ValidationError('File exceeds the 100 MB import limit.');
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0) throw new ValidationError('The URL returned an empty file.');
    if (buffer.length > MAX_IMPORT_BYTES) {
      throw new ValidationError('File exceeds the 100 MB import limit.');
    }
    const contentType = response.headers.get('content-type')?.split(';')[0]?.trim() || 'audio/mpeg';

    const meeting = await this.prisma.meeting.create({
      data: {
        workspaceId: workspace.id,
        title: input.title?.trim() || defaultTitleFromUrl(input.url),
        ownerId: userId,
        sourceType: 'UPLOAD',
        status: 'QUEUED',
        occurredAt: new Date(),
      },
    });

    const storageKey = `meetings/${meeting.id}/original`;
    await this.storage.put(storageKey, buffer, contentType);
    await this.prisma.meetingMedia.create({
      data: {
        meetingId: meeting.id,
        originalStorageKey: storageKey,
        mimeType: contentType,
        sizeBytes: BigInt(buffer.length),
      },
    });

    await this.usage.incrementMeetings(workspace.id);
    await this.queue.enqueueMeetingProcessing(meeting.id);
    return toMeetingDto(meeting);
  }

  async getForUser(meetingId: string, userId: string) {
    const meeting = await this.prisma.meeting.findFirst({
      where: { id: meetingId, deletedAt: null },
    });
    if (!meeting) throw new NotFoundError('Meeting');
    const allowed = await this.workspaces.isMember(userId, meeting.workspaceId);
    // Cross-tenant access looks the same as "not found" — never reveal existence.
    if (!allowed) throw new NotFoundError('Meeting');
    return meeting;
  }

  async list(
    userId: string,
    options: { cursor?: string; limit?: number; status?: string; q?: string },
  ) {
    const workspace = await this.workspaces.getActiveForUser(userId);
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);

    const rows = await this.prisma.meeting.findMany({
      where: {
        workspaceId: workspace.id,
        deletedAt: null,
        ...(options.status ? { status: options.status as MeetingStatus } : {}),
        ...(options.q ? { title: { contains: options.q, mode: 'insensitive' } } : {}),
      },
      orderBy: { occurredAt: 'desc' },
      take: limit + 1,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: slice.map(toMeetingDto),
      nextCursor: hasMore ? (rows[limit - 1]?.id ?? null) : null,
      hasMore,
    };
  }

  async getSummary(meetingId: string, userId: string) {
    await this.getForUser(meetingId, userId);
    const summary = await this.prisma.summary.findUnique({ where: { meetingId } });
    if (!summary) throw new NotFoundError('Summary');
    return { overview: summary.overview, keyPoints: summary.keyPoints as string[] };
  }

  async updateSummary(
    meetingId: string,
    patch: { overview?: string; keyPoints?: string[] },
    userId: string,
  ) {
    await this.getForUser(meetingId, userId);
    const existing = await this.prisma.summary.findUnique({ where: { meetingId } });
    if (!existing) throw new NotFoundError('Summary');
    const updated = await this.prisma.summary.update({
      where: { meetingId },
      data: {
        ...(patch.overview !== undefined ? { overview: patch.overview } : {}),
        ...(patch.keyPoints !== undefined ? { keyPoints: patch.keyPoints } : {}),
      },
    });
    return { overview: updated.overview, keyPoints: updated.keyPoints as string[] };
  }

  async getTranscript(meetingId: string, userId: string) {
    await this.getForUser(meetingId, userId);
    const transcript = await this.prisma.transcript.findUnique({
      where: { meetingId },
      include: { segments: { orderBy: { index: 'asc' } } },
    });
    if (!transcript) throw new NotFoundError('Transcript');
    return {
      id: transcript.id,
      meetingId,
      language: transcript.language,
      segments: transcript.segments.map((s) => ({
        id: s.id,
        index: s.index,
        speakerLabel: s.speakerLabel,
        startTimeMs: s.startTimeMs,
        endTimeMs: s.endTimeMs,
        text: s.text,
      })),
    };
  }

  async getActionItems(meetingId: string, userId: string) {
    await this.getForUser(meetingId, userId);
    const items = await this.prisma.actionItem.findMany({
      where: { meetingId },
      orderBy: { createdAt: 'asc' },
    });
    return items.map((a) => ({
      id: a.id,
      meetingId,
      text: a.text,
      assigneeText: a.assigneeText,
      assigneeUserId: a.assigneeUserId,
      dueDate: a.dueDate?.toISOString() ?? null,
      status: a.status,
    }));
  }

  async updateActionItem(
    meetingId: string,
    itemId: string,
    patch: {
      status?: ActionItemStatus;
      assigneeUserId?: string | null;
      dueDate?: string | null;
    },
    userId: string,
  ) {
    const meeting = await this.getForUser(meetingId, userId);
    const item = await this.prisma.actionItem.findFirst({ where: { id: itemId, meetingId } });
    if (!item) throw new NotFoundError('Action item');

    const data: {
      status?: ActionItemStatus;
      assigneeUserId?: string | null;
      dueDate?: Date | null;
    } = {};

    if (patch.status !== undefined) data.status = patch.status;

    if (patch.assigneeUserId !== undefined) {
      if (patch.assigneeUserId !== null) {
        const ok = await this.workspaces.isMember(patch.assigneeUserId, meeting.workspaceId);
        if (!ok) throw new ValidationError('Assignee is not a member of this workspace.');
      }
      data.assigneeUserId = patch.assigneeUserId;
    }

    if (patch.dueDate !== undefined) {
      data.dueDate = patch.dueDate ? new Date(patch.dueDate) : null;
    }

    const updated = await this.prisma.actionItem.update({ where: { id: itemId }, data });

    // Bell notification for a newly-assigned user (not for re-assigning to the same person).
    if (patch.assigneeUserId && patch.assigneeUserId !== item.assigneeUserId) {
      await this.prisma.notification
        .create({
          data: {
            userId: patch.assigneeUserId,
            type: 'task.assigned',
            payload: {
              title: `You were assigned: ${updated.text.slice(0, 80)}`,
              meetingId,
            },
          },
        })
        .catch(() => undefined);
    }

    return {
      id: updated.id,
      meetingId,
      text: updated.text,
      assigneeText: updated.assigneeText,
      assigneeUserId: updated.assigneeUserId,
      dueDate: updated.dueDate?.toISOString() ?? null,
      status: updated.status,
    };
  }

  async getDecisions(meetingId: string, userId: string) {
    await this.getForUser(meetingId, userId);
    const decisions = await this.prisma.decision.findMany({
      where: { meetingId },
      orderBy: { createdAt: 'asc' },
    });
    return decisions.map((d) => ({
      id: d.id,
      text: d.text,
      context: d.context,
      createdAt: d.createdAt.toISOString(),
    }));
  }

  /** Detected topics/chapters (extracted by the LLM), ordered for display. */
  async getTopics(meetingId: string, userId: string) {
    await this.getForUser(meetingId, userId);
    const topics = await this.prisma.topic.findMany({
      where: { meetingId },
      orderBy: { sortOrder: 'asc' },
    });
    return topics.map((t) => ({
      id: t.id,
      label: t.label,
      summary: t.summary,
      startTimeMs: t.startTimeMs,
    }));
  }

  async getComments(meetingId: string, userId: string) {
    await this.getForUser(meetingId, userId);
    const comments = await this.prisma.comment.findMany({
      where: { meetingId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });

    // Resolve anchored segment start times in one query (avoid N+1).
    const segmentIds = comments
      .map((c) => c.transcriptSegmentId)
      .filter((v): v is string => Boolean(v));
    const segments = segmentIds.length
      ? await this.prisma.transcriptSegment.findMany({
          where: { id: { in: segmentIds } },
          select: { id: true, startTimeMs: true },
        })
      : [];
    const startById = new Map(segments.map((s) => [s.id, s.startTimeMs]));

    return comments.map((c) => ({
      id: c.id,
      meetingId,
      userId: c.userId,
      authorName: c.user.name,
      authorEmail: c.user.email,
      transcriptSegmentId: c.transcriptSegmentId,
      segmentStartMs: c.transcriptSegmentId ? (startById.get(c.transcriptSegmentId) ?? null) : null,
      type: c.type,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
    }));
  }

  async createComment(meetingId: string, data: CreateCommentRequest, userId: string) {
    await this.getForUser(meetingId, userId);
    if (data.transcriptSegmentId) {
      const seg = await this.prisma.transcriptSegment.findFirst({
        where: { id: data.transcriptSegmentId, transcript: { meetingId } },
      });
      if (!seg) throw new ValidationError('Invalid transcript segment for this meeting.');
    }
    const created = await this.prisma.comment.create({
      data: {
        meetingId,
        userId,
        body: data.body,
        type: data.type,
        transcriptSegmentId: data.transcriptSegmentId ?? null,
      },
      include: { user: { select: { name: true, email: true } } },
    });
    let segmentStartMs: number | null = null;
    if (created.transcriptSegmentId) {
      const seg = await this.prisma.transcriptSegment.findUnique({
        where: { id: created.transcriptSegmentId },
        select: { startTimeMs: true },
      });
      segmentStartMs = seg?.startTimeMs ?? null;
    }
    return {
      id: created.id,
      meetingId,
      userId: created.userId,
      authorName: created.user.name,
      authorEmail: created.user.email,
      transcriptSegmentId: created.transcriptSegmentId,
      segmentStartMs,
      type: created.type,
      body: created.body,
      createdAt: created.createdAt.toISOString(),
    };
  }

  async deleteComment(meetingId: string, commentId: string, userId: string) {
    const meeting = await this.getForUser(meetingId, userId);
    const comment = await this.prisma.comment.findFirst({ where: { id: commentId, meetingId } });
    if (!comment) throw new NotFoundError('Comment');
    if (comment.userId !== userId) {
      const role = await this.workspaces.getMemberRole(userId, meeting.workspaceId);
      if (role !== 'ADMIN' && role !== 'OWNER') {
        throw new ForbiddenError('You can only delete your own comments.');
      }
    }
    await this.prisma.comment.delete({ where: { id: commentId } });
  }

  async createShareLink(meetingId: string, data: CreateShareLinkRequest, userId: string) {
    const meeting = await this.getForUser(meetingId, userId);
    const token = randomUUID();
    const expiresAt = data.expiresInDays
      ? new Date(Date.now() + data.expiresInDays * 86_400_000)
      : null;
    const link = await this.prisma.shareLink.create({
      data: { meetingId, createdById: userId, role: data.role, token, expiresAt },
    });

    // Tell the rest of the workspace a share link exists (best-effort).
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId: meeting.workspaceId, status: 'ACTIVE' },
      select: { userId: true },
    });
    for (const member of members.filter((m) => m.userId !== userId)) {
      await this.prisma.notification
        .create({
          data: {
            userId: member.userId,
            type: 'meeting.shared',
            payload: { title: `${meeting.title} was shared via link`, meetingId },
          },
        })
        .catch(() => undefined);
    }

    return this.toShareLinkDto(link);
  }

  async listShareLinks(meetingId: string, userId: string) {
    await this.getForUser(meetingId, userId);
    const links = await this.prisma.shareLink.findMany({
      where: { meetingId },
      orderBy: { createdAt: 'desc' },
    });
    return links.map((l) => this.toShareLinkDto(l));
  }

  async revokeShareLink(meetingId: string, linkId: string, userId: string) {
    await this.getForUser(meetingId, userId);
    const link = await this.prisma.shareLink.findFirst({ where: { id: linkId, meetingId } });
    if (!link) throw new NotFoundError('Share link');
    await this.prisma.shareLink.update({
      where: { id: linkId },
      data: { revokedAt: new Date() },
    });
  }

  /** Public read-only view, resolved from an unexpired, non-revoked token. */
  async getSharedView(token: string): Promise<SharedMeetingView> {
    const link = await this.prisma.shareLink.findUnique({ where: { token } });
    if (!link || link.revokedAt) throw new NotFoundError('Share link');
    if (link.expiresAt && link.expiresAt < new Date()) throw new NotFoundError('Share link');

    const meeting = await this.prisma.meeting.findUnique({
      where: { id: link.meetingId },
      select: { id: true, title: true, occurredAt: true, durationSeconds: true },
    });
    if (!meeting) throw new NotFoundError('Meeting');

    const [summary, transcript] = await Promise.all([
      this.prisma.summary.findUnique({
        where: { meetingId: meeting.id },
        select: { overview: true, keyPoints: true },
      }),
      this.prisma.transcript.findUnique({
        where: { meetingId: meeting.id },
        include: { segments: { orderBy: { index: 'asc' } } },
      }),
    ]);

    return {
      meeting: {
        id: meeting.id,
        title: meeting.title,
        occurredAt: meeting.occurredAt.toISOString(),
        durationSeconds: meeting.durationSeconds,
      },
      summary: summary
        ? { overview: summary.overview, keyPoints: summary.keyPoints as string[] }
        : null,
      transcript: transcript
        ? {
            segments: transcript.segments.map((s) => ({
              id: s.id,
              index: s.index,
              speakerLabel: s.speakerLabel,
              startTimeMs: s.startTimeMs,
              endTimeMs: s.endTimeMs,
              text: s.text,
            })),
          }
        : null,
    };
  }

  private toShareLinkDto(link: {
    id: string;
    meetingId: string;
    role: 'VIEWER' | 'COMMENTER';
    token: string;
    expiresAt: Date | null;
    revokedAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: link.id,
      meetingId: link.meetingId,
      role: link.role,
      url: `${env.APP_URL}/share/${link.token}`,
      expiresAt: link.expiresAt?.toISOString() ?? null,
      revokedAt: link.revokedAt?.toISOString() ?? null,
      createdAt: link.createdAt.toISOString(),
    };
  }

  async getPlaybackUrl(meetingId: string, userId: string) {
    const meeting = await this.getForUser(meetingId, userId);
    const media = await this.prisma.meetingMedia.findFirst({ where: { meetingId: meeting.id } });
    if (!media) throw new NotFoundError('Media');
    return { playbackUrl: await this.storage.getPresignedGetUrl(media.originalStorageKey) };
  }

  /** Full-meeting Markdown export: summary, key points, action items, decisions, transcript. */
  async exportMarkdown(meetingId: string, userId: string): Promise<{ filename: string; content: string }> {
    const meeting = await this.getForUser(meetingId, userId);
    const [summary, items, decisions, transcript] = await Promise.all([
      this.prisma.summary.findUnique({ where: { meetingId } }),
      this.prisma.actionItem.findMany({ where: { meetingId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.decision.findMany({ where: { meetingId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.transcript.findUnique({
        where: { meetingId },
        include: { segments: { orderBy: { index: 'asc' } } },
      }),
    ]);

    const lines: string[] = [
      `# ${meeting.title}`,
      '',
      `**Date:** ${meeting.occurredAt.toISOString().slice(0, 10)}`,
      meeting.durationSeconds ? `**Duration:** ${Math.round(meeting.durationSeconds / 60)} min` : '',
      '',
      '## Overview',
      summary?.overview ?? '_No summary available._',
      '',
    ];

    const keyPoints = (summary?.keyPoints as string[] | undefined) ?? [];
    if (keyPoints.length > 0) {
      lines.push('## Key points', ...keyPoints.map((p) => `- ${p}`), '');
    }

    if (items.length > 0) {
      lines.push('## Action items');
      for (const item of items) {
        const meta = [item.assigneeText ? `_${item.assigneeText}_` : null, `(${item.status.toLowerCase()})`]
          .filter(Boolean)
          .join(' ');
        lines.push(`- [${item.status === 'DONE' ? 'x' : ' '}] ${item.text} ${meta}`.trimEnd());
      }
      lines.push('');
    }

    if (decisions.length > 0) {
      lines.push('## Decisions');
      for (const d of decisions) {
        lines.push(`- ${d.text}${d.context ? `\n  - _${d.context}_` : ''}`);
      }
      lines.push('');
    }

    if (transcript && transcript.segments.length > 0) {
      lines.push('## Transcript', '');
      for (const s of transcript.segments) {
        lines.push(`**[${formatMinutes(s.startTimeMs)}] ${s.speakerLabel}:** ${s.text}`, '');
      }
    }

    return { filename: `${slugify(meeting.title)}.md`, content: lines.join('\n') };
  }

  /** Transcript as SubRip (.srt) subtitles. */
  async exportSrt(meetingId: string, userId: string): Promise<{ filename: string; content: string }> {
    const meeting = await this.getForUser(meetingId, userId);
    const transcript = await this.prisma.transcript.findUnique({
      where: { meetingId },
      include: { segments: { orderBy: { index: 'asc' } } },
    });
    if (!transcript) throw new NotFoundError('Transcript');

    const content = transcript.segments
      .map((s, i) => `${i + 1}\n${srtTimestamp(s.startTimeMs)} --> ${srtTimestamp(s.endTimeMs)}\n${s.text}\n`)
      .join('\n');

    return { filename: `${slugify(meeting.title)}.srt`, content };
  }

  private validateFile(mimeType: string, sizeBytes: number): void {
    if (!(ALLOWED_UPLOAD_MIME as readonly string[]).includes(mimeType)) {
      throw new ValidationError(`Unsupported file type: ${mimeType}`);
    }
    if (sizeBytes > MAX_UPLOAD_BYTES) {
      throw new ValidationError('File exceeds the 2 GB upload limit.');
    }
  }
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'meeting'
  );
}

function defaultTitleFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const lastSegment = parsed.pathname.split('/').filter(Boolean).pop() ?? '';
    return `${parsed.hostname}${lastSegment ? ` — ${lastSegment}` : ''}`.slice(0, 200);
  } catch {
    return 'Imported meeting';
  }
}

function formatMinutes(ms: number): string {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function srtTimestamp(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(
    ms % 1000,
  ).padStart(3, '0')}`;
}
