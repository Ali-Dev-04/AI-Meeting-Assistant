import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';

/** Aggregated workspace numbers for the dashboard cards. */
@Injectable()
export class StatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaces: WorkspacesService,
  ) {}

  async get(userId: string) {
    const workspace = await this.workspaces.getActiveForUser(userId);

    const [total, ready, processing, open, overdue, done] = await Promise.all([
      this.prisma.meeting.count({ where: { workspaceId: workspace.id, deletedAt: null } }),
      this.prisma.meeting.count({ where: { workspaceId: workspace.id, deletedAt: null, status: 'READY' } }),
      // "Processing" = anywhere in the pipeline that hasn't finished or failed.
      this.prisma.meeting.count({
        where: {
          workspaceId: workspace.id,
          deletedAt: null,
          status: { in: ['QUEUED', 'TRANSCRIBING', 'SUMMARIZING', 'INDEXING'] },
        },
      }),
      this.prisma.actionItem.count({
        where: { meeting: { workspaceId: workspace.id, deletedAt: null }, status: 'OPEN' },
      }),
      this.prisma.actionItem.count({
        where: {
          meeting: { workspaceId: workspace.id, deletedAt: null },
          status: 'OPEN',
          dueDate: { lt: new Date() },
        },
      }),
      this.prisma.actionItem.count({
        where: { meeting: { workspaceId: workspace.id, deletedAt: null }, status: 'DONE' },
      }),
    ]);

    const completionBase = open + done; // dismissed items don't count against you
    return {
      meetings: { total, ready, processing },
      actionItems: {
        open,
        overdue,
        done,
        completionRate: completionBase === 0 ? 0 : Math.round((done / completionBase) * 100),
      },
    };
  }
}
