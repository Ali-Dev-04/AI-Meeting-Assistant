import { z } from 'zod';

/** AI-generated summary for a meeting (1:1 with Meeting). */
export interface Summary {
  overview: string;
  keyPoints: string[];
}

/** Edit the AI summary — either field optional, but at least one required. */
export const updateSummarySchema = z
  .object({
    overview: z.string().trim().min(1).max(5000).optional(),
    keyPoints: z.array(z.string().trim().min(1).max(300)).max(20).optional(),
  })
  .refine((v) => v.overview !== undefined || v.keyPoints !== undefined, {
    message: 'Provide at least one of overview or keyPoints.',
  });
export type UpdateSummaryRequest = z.infer<typeof updateSummarySchema>;

export const actionItemStatusSchema = z.enum(['OPEN', 'DONE', 'DISMISSED']);
export type ActionItemStatus = z.infer<typeof actionItemStatusSchema>;

export interface ActionItem {
  id: string;
  meetingId: string;
  text: string;
  assigneeText: string | null;
  assigneeUserId: string | null;
  dueDate: string | null;
  status: ActionItemStatus;
}

/**
 * Update any combination of an action item's status, assignee, or due date.
 * All fields optional, but at least one must be provided (enforced by refine).
 */
export const updateActionItemSchema = z
  .object({
    status: actionItemStatusSchema.optional(),
    assigneeUserId: z.string().uuid().nullable().optional(),
    dueDate: z.string().datetime().nullable().optional(),
  })
  .refine(
    (v) => v.status !== undefined || v.assigneeUserId !== undefined || v.dueDate !== undefined,
    { message: 'Provide at least one of status, assigneeUserId, or dueDate.' },
  );
export type UpdateActionItemRequest = z.infer<typeof updateActionItemSchema>;

/** An action item with its parent meeting context — the shape of a "Tasks" list row. */
export interface Task extends ActionItem {
  meetingTitle: string;
  occurredAt: string;
}

export interface Decision {
  id: string;
  text: string;
  context: string | null;
  createdAt: string;
}

/** A detected topic/chapter within a meeting (startMs anchors it in the transcript). */
export interface Topic {
  id: string;
  label: string;
  summary: string | null;
  startTimeMs: number | null;
}

/** In-app notification (bell). The stored JSON payload is flattened for the client. */
export interface AppNotification {
  id: string;
  /** 'meeting.ready' | 'task.assigned' | 'meeting.shared' */
  type: string;
  title: string;
  meetingId: string | null;
  createdAt: string;
  readAt: string | null;
}

export interface TranscriptSegment {
  id: string;
  index: number;
  speakerLabel: string;
  startTimeMs: number;
  endTimeMs: number;
  text: string;
}

export interface Transcript {
  id: string;
  meetingId: string;
  language: string;
  segments: TranscriptSegment[];
}

/** Presigned playback URL for the (transcoded) media. */
export interface MeetingPlayback {
  playbackUrl: string | null;
}

export const commentTypeSchema = z.enum(['COMMENT', 'HIGHLIGHT']);
export type CommentType = z.infer<typeof commentTypeSchema>;

/** A comment or highlight, optionally anchored to a transcript segment. */
export interface Comment {
  id: string;
  meetingId: string;
  userId: string;
  authorName: string | null;
  authorEmail: string;
  /** UUID of the TranscriptSegment this is anchored to (soft reference). */
  transcriptSegmentId: string | null;
  /** Denormalized segment start time, for display (null if not anchored). */
  segmentStartMs: number | null;
  type: CommentType;
  body: string;
  createdAt: string;
}

export const createCommentSchema = z.object({
  body: z.string().trim().min(1, 'Comment cannot be empty').max(2000),
  type: commentTypeSchema.default('COMMENT'),
  transcriptSegmentId: z.string().uuid().nullable().optional(),
});
export type CreateCommentRequest = z.infer<typeof createCommentSchema>;

export const shareRoleSchema = z.enum(['VIEWER', 'COMMENTER']);
export type ShareRole = z.infer<typeof shareRoleSchema>;

/** A shareable, revocable link to view a meeting. */
export interface ShareLink {
  id: string;
  meetingId: string;
  role: ShareRole;
  url: string;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export const createShareLinkSchema = z.object({
  role: shareRoleSchema.default('VIEWER'),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});
export type CreateShareLinkRequest = z.infer<typeof createShareLinkSchema>;

/** Public, read-only view of a shared meeting (no sensitive fields). */
export interface SharedMeetingView {
  meeting: { id: string; title: string; occurredAt: string; durationSeconds: number | null };
  summary: { overview: string; keyPoints: string[] } | null;
  transcript: { segments: TranscriptSegment[] } | null;
}
