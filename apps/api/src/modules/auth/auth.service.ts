import { Injectable } from '@nestjs/common';
import { LoginRequest, RegisterRequest } from '@ama/shared-types';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ConflictError, NotFoundError, UnauthenticatedError } from '../../common/errors';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { shortId, slugify, toUserDto } from './auth.util';

interface AuthPayload {
  id: string;
  email: string;
}

interface IssueResult {
  user: AuthPayload;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
  ) {}

  async register(input: RegisterRequest): Promise<IssueResult> {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new ConflictError('An account with this email already exists.');

    const passwordHash = await this.passwords.hash(input.password);
    const user = await this.prisma.user.create({
      data: { email: input.email, name: input.name ?? null, passwordHash },
    });

    // Provision a personal workspace so the new user can start immediately.
    await this.createPersonalWorkspace(user.id, input.name ?? input.email);

    // Join any workspaces this email was invited to (with the invited role).
    await this.acceptInvitations(user.id, input.email);

    return this.issue(user.id, user.email);
  }

  async login(input: LoginRequest): Promise<IssueResult> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    const valid =
      user?.passwordHash != null && (await this.passwords.compare(input.password, user.passwordHash));
    if (!user || !valid) {
      // Same message for "no user" and "wrong password" to avoid user enumeration.
      throw new UnauthenticatedError('Invalid email or password.');
    }
    return this.issue(user.id, user.email);
  }

  async refresh(oldRefreshToken: string): Promise<IssueResult> {
    const rotated = await this.tokens.rotateRefreshToken(oldRefreshToken);
    if (!rotated) throw new UnauthenticatedError('Invalid or expired refresh token.');

    const user = await this.prisma.user.findUnique({ where: { id: rotated.userId } });
    if (!user) throw new UnauthenticatedError();

    return {
      user: { id: user.id, email: user.email },
      accessToken: this.tokens.signAccessToken({ id: user.id, email: user.email }),
      refreshToken: rotated.refreshToken,
    };
  }

  async logout(refreshToken?: string): Promise<void> {
    await this.tokens.revokeRefreshToken(refreshToken);
  }

  async getSession(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');
    return { user: toUserDto(user) };
  }

  private async issue(userId: string, email: string): Promise<IssueResult> {
    const accessToken = this.tokens.signAccessToken({ id: userId, email });
    const refreshToken = await this.tokens.issueRefreshToken(userId);
    return { user: { id: userId, email }, accessToken, refreshToken };
  }

  private async createPersonalWorkspace(ownerId: string, name: string): Promise<void> {
    const workspaceName = name || 'My Workspace';
    await this.prisma.workspace.create({
      data: {
        name: workspaceName,
        slug: `${slugify(workspaceName)}-${shortId()}`,
        ownerId,
        plan: 'FREE',
        members: { create: { userId: ownerId, role: 'OWNER', status: 'ACTIVE' } },
      },
    });
  }

  /** Auto-accept unexpired PENDING invitations for this email (Settings → Invite). */
  private async acceptInvitations(userId: string, email: string): Promise<void> {
    const pending = await this.prisma.invitation.findMany({
      where: { email: email.toLowerCase(), status: 'PENDING', expiresAt: { gt: new Date() } },
    });
    for (const invitation of pending) {
      await this.prisma.workspaceMember.upsert({
        where: { userId_workspaceId: { userId, workspaceId: invitation.workspaceId } },
        update: { role: invitation.role, status: 'ACTIVE' },
        create: {
          userId,
          workspaceId: invitation.workspaceId,
          role: invitation.role,
          status: 'ACTIVE',
        },
      });
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' },
      });
    }
  }
}
