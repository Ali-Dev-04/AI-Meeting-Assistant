import { Injectable } from '@nestjs/common';
import { MemberRole, Workspace } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type { Invitation, InviteValues, UpdateMemberRoleRequest } from '@ama/shared-types';
import { ConflictError, ForbiddenError, NotFoundError } from '../../common/errors';
import { env } from '../../config/env';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

const INVITE_EXPIRY_MS = 7 * 86_400_000;

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

  /**
   * Invite by email. With email delivery unconfigured (no Resend key) the response
   * carries a shareable inviteUrl — the invitee registers with that email and is
   * auto-joined with this role (see AuthService.register).
   */
  async invite(workspaceId: string, inviterId: string, input: InviteValues): Promise<Invitation> {
    await this.assertManager(inviterId, workspaceId);

    const email = input.email.trim().toLowerCase();
    const alreadyMember = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, user: { email } },
    });
    if (alreadyMember) throw new ConflictError('That person is already a member.');

    // One live invitation per email — supersede any older pending one.
    await this.prisma.invitation.updateMany({
      where: { workspaceId, email, status: 'PENDING' },
      data: { status: 'REVOKED' },
    });

    const invitation = await this.prisma.invitation.create({
      data: {
        workspaceId,
        email,
        role: input.role,
        token: randomUUID(),
        invitedById: inviterId,
        expiresAt: new Date(Date.now() + INVITE_EXPIRY_MS),
      },
    });
    return this.toInvitationDto(invitation);
  }

  async listInvitations(workspaceId: string, userId: string): Promise<Invitation[]> {
    await this.assertManager(userId, workspaceId);
    const invitations = await this.prisma.invitation.findMany({
      where: { workspaceId, status: 'PENDING', expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    return invitations.map((i) => this.toInvitationDto(i));
  }

  async revokeInvitation(workspaceId: string, invitationId: string, userId: string) {
    await this.assertManager(userId, workspaceId);
    const invitation = await this.prisma.invitation.findFirst({
      where: { id: invitationId, workspaceId },
    });
    if (!invitation) throw new NotFoundError('Invitation');
    await this.prisma.invitation.update({
      where: { id: invitationId },
      data: { status: 'REVOKED' },
    });
  }

  async updateMemberRole(
    workspaceId: string,
    memberId: string,
    actorId: string,
    input: UpdateMemberRoleRequest,
  ) {
    const actorRole = await this.assertManager(actorId, workspaceId);
    if (actorRole !== 'OWNER') {
      throw new ForbiddenError('Only the workspace owner can change roles.');
    }
    const member = await this.prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
    });
    if (!member) throw new NotFoundError('Member');
    if (member.role === 'OWNER') {
      throw new ForbiddenError("The owner's role cannot be changed.");
    }
    await this.prisma.workspaceMember.update({ where: { id: memberId }, data: { role: input.role } });
  }

  async removeMember(workspaceId: string, memberId: string, actorId: string) {
    const actorRole = await this.assertManager(actorId, workspaceId);
    const member = await this.prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
    });
    if (!member) throw new NotFoundError('Member');
    if (member.userId === actorId) throw new ForbiddenError('You cannot remove yourself.');
    if (member.role === 'OWNER') {
      throw new ForbiddenError('The workspace owner cannot be removed.');
    }
    if (actorRole !== 'OWNER' && member.role === 'ADMIN') {
      throw new ForbiddenError('Only the owner can remove an admin.');
    }
    await this.prisma.workspaceMember.delete({ where: { id: memberId } });
  }

  /** ADMIN/OWNER gate for member management. Returns the actor's role. */
  private async assertManager(userId: string, workspaceId: string): Promise<MemberRole> {
    const role = await this.getMemberRole(userId, workspaceId);
    if (!role || (role !== 'OWNER' && role !== 'ADMIN')) {
      throw new ForbiddenError('Only workspace admins can manage members.');
    }
    return role;
  }

  private toInvitationDto(invitation: {
    id: string;
    email: string;
    role: MemberRole;
    status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
    token: string;
    expiresAt: Date;
    createdAt: Date;
  }): Invitation {
    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt.toISOString(),
      createdAt: invitation.createdAt.toISOString(),
      // Email isn't configured in dev — hand back a link the inviter can share.
      inviteUrl: `${env.APP_URL}/register?email=${encodeURIComponent(invitation.email)}&invite=${invitation.token}`,
    };
  }
}
