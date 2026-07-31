import { Injectable } from '@nestjs/common';
import { Workspace } from '@prisma/client';
import { QuotaExceededError } from '../../common/errors';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PLAN_LIMITS } from './plan-limits';

/** Current billing period as "YYYY-MM" (UTC). */
function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}

/**
 * Tracks and enforces freemium quotas via the `usage_records` table (one row per
 * workspace per month). The upload path checks meeting-count quota; the worker
 * later records transcribed seconds.
 */
@Injectable()
export class UsageService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOrCreate(workspaceId: string) {
    const period = currentPeriod();
    return this.prisma.usageRecord.upsert({
      where: { workspaceId_period: { workspaceId, period } },
      create: { workspaceId, period },
      update: {},
    });
  }

  async assertCanUpload(workspace: Workspace): Promise<void> {
    const limit = PLAN_LIMITS[workspace.plan].meetingsPerMonth;
    if (limit === Infinity) return;
    const record = await this.getOrCreate(workspace.id);
    if (record.meetingCount >= limit) {
      throw new QuotaExceededError(
        `You've reached your plan limit of ${limit} meetings this month. Upgrade for more.`,
      );
    }
  }

  async incrementMeetings(workspaceId: string, by = 1): Promise<void> {
    const period = currentPeriod();
    await this.prisma.usageRecord.upsert({
      where: { workspaceId_period: { workspaceId, period } },
      create: { workspaceId, period, meetingCount: by },
      update: { meetingCount: { increment: by } },
    });
  }

  async addTranscribedSeconds(workspaceId: string, seconds: number): Promise<void> {
    const period = currentPeriod();
    await this.prisma.usageRecord.upsert({
      where: { workspaceId_period: { workspaceId, period } },
      create: { workspaceId, period, transcribedSeconds: seconds },
      update: { transcribedSeconds: { increment: seconds } },
    });
  }

  async getCurrentUsage(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new QuotaExceededError('Workspace not found.');
    const limits = PLAN_LIMITS[workspace.plan];
    const record = await this.getOrCreate(workspaceId);
    return {
      plan: workspace.plan,
      period: record.period,
      meetingCount: record.meetingCount,
      meetingLimit: limits.meetingsPerMonth,
      transcribedSeconds: record.transcribedSeconds,
      transcribedLimitSeconds: limits.minutesPerMonth * 60,
      chatCount: record.chatCount,
      chatLimit: limits.chatsPerDay,
    };
  }
}
