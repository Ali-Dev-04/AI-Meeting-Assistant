import { Injectable } from '@nestjs/common';
import { ActionItemStatus } from '@prisma/client';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

/**
 * Cross-meeting "Tasks" view: action items across all meetings in the user's
 * active workspace, optionally filtered to just the ones assigned to them.
 * (Single-meeting action-item reads/writes live on MeetingsService.)
 */
@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaces: WorkspacesService,
  ) {}

  async list(
    userId: string,
    options: { status?: string; scope?: string },
  ): Promise<{
    items: Array<{
      id: string;
      meetingId: string;
      text: string;
      assigneeText: string | null;
      assigneeUserId: string | null;
      dueDate: string | null;
      status: ActionItemStatus;
      meetingTitle: string;
      occurredAt: string;
    }>;
  }> {
    const workspace = await this.workspaces.getActiveForUser(userId);
    // mine = assigned to the caller (default) · unassigned = triage queue · all = everything.
    const scope = options.scope === 'all' || options.scope === 'unassigned' ? options.scope : 'mine';

    const items = await this.prisma.actionItem.findMany({
      where: {
        meeting: { workspaceId: workspace.id, deletedAt: null },
        ...(scope === 'mine' ? { assigneeUserId: userId } : {}),
        ...(scope === 'unassigned' ? { assigneeUserId: null } : {}),
        ...(options.status ? { status: options.status as ActionItemStatus } : {}),
      },
      include: { meeting: { select: { id: true, title: true, occurredAt: true } } },
      orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],
      take: 200,
    });

    return {
      items: items.map((a) => ({
        id: a.id,
        meetingId: a.meetingId,
        text: a.text,
        assigneeText: a.assigneeText,
        assigneeUserId: a.assigneeUserId,
        dueDate: a.dueDate?.toISOString() ?? null,
        status: a.status,
        meetingTitle: a.meeting.title,
        occurredAt: a.meeting.occurredAt.toISOString(),
      })),
    };
  }
}
