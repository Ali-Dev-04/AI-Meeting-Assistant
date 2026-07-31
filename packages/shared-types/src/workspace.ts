import { z } from 'zod';

export const memberRoleSchema = z.enum(['OWNER', 'ADMIN', 'MEMBER']);
export type MemberRole = z.infer<typeof memberRoleSchema>;

export const planTierSchema = z.enum(['FREE', 'PRO', 'BUSINESS', 'ENTERPRISE']);
export type PlanTier = z.infer<typeof planTierSchema>;

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: PlanTier;
}

export interface Member {
  id: string;
  userId: string;
  workspaceId: string;
  role: MemberRole;
  status: 'ACTIVE' | 'PENDING';
  user: { id: string; email: string; name: string | null };
  joinedAt: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: MemberRole;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  expiresAt: string;
}

export const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  role: memberRoleSchema.default('MEMBER'),
});
export type InviteValues = z.infer<typeof inviteSchema>;

/** Current-period usage against the plan's limits. */
export interface Usage {
  plan: PlanTier;
  period: string;
  meetingCount: number;
  meetingLimit: number;
  transcribedSeconds: number;
  transcribedLimitSeconds: number;
  chatCount: number;
  chatLimit: number;
}

export interface CheckoutSession {
  url: string;
}
