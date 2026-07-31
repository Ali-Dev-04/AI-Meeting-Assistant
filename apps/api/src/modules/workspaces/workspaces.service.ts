import { Injectable } from '@nestjs/common';
import { MemberRole, Workspace } from '@prisma/client';
import { NotFoundError } from '../../common/errors';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

/**
 * Workspace/tenant resolution. v1 treats the user's first membership as the
 * "active" workspace; later phases add explicit workspace selection.
 */
@Injectable()
export class WorkspacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /** The user's active workspace (first joined). Cached — this runs on most requests. */
  async getActiveForUser(userId: string): Promise<Workspace> {
    const key = `workspace:active:${userId}`;
    const cached = await this.cache.get<Workspace>(key);
    if (cached) return cached;

    const membership = await this.prisma.workspaceMember.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: { workspace: true },
      orderBy: { joinedAt: 'asc' },
    });
    if (!membership) throw new NotFoundError('Workspace');

    await this.cache.set(key, membership.workspace, 60);
    return membership.workspace;
  }

  async listForUser(userId: string) {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId, status: 'ACTIVE', workspace: { deletedAt: null } },
      include: { workspace: true },
    });
    return memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      plan: m.workspace.plan,
    }));
  }

  async isMember(userId: string, workspaceId: string): Promise<boolean> {
    const count = await this.prisma.workspaceMember.count({
      where: { userId, workspaceId, status: 'ACTIVE' },
    });
    return count > 0;
  }

  /** The caller's role in a workspace (null if not an active member). */
  async getMemberRole(userId: string, workspaceId: string): Promise<MemberRole | null> {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: { userId, workspaceId, status: 'ACTIVE' },
      select: { role: true },
    });
    return membership?.role ?? null;
  }

  async listMembers(userId: string, workspaceId: string) {
    const isMember = await this.isMember(userId, workspaceId);
    if (!isMember) throw new NotFoundError('Workspace'); // don't leak existence

    const memberships = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: true },
      orderBy: { joinedAt: 'asc' },
    });
    return memberships.map((m) => ({
      id: m.id,
      userId: m.userId,
      workspaceId: m.workspaceId,
      role: m.role,
      status: m.status,
      user: { id: m.user.id, email: m.user.email, name: m.user.name },
      joinedAt: m.joinedAt.toISOString(),
    }));
  }
}
