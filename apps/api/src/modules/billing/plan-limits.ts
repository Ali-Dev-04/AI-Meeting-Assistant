import { PlanTier } from '@prisma/client';

/** Per-plan quota limits (mirrors docs/PRD.md §11). `Infinity` means unlimited. */
export const PLAN_LIMITS: Record<
  PlanTier,
  { meetingsPerMonth: number; minutesPerMonth: number; chatsPerDay: number }
> = {
  FREE: { meetingsPerMonth: 5, minutesPerMonth: 300, chatsPerDay: 3 },
  PRO: { meetingsPerMonth: 50, minutesPerMonth: 2000, chatsPerDay: Infinity },
  BUSINESS: { meetingsPerMonth: Infinity, minutesPerMonth: 10000, chatsPerDay: Infinity },
  ENTERPRISE: { meetingsPerMonth: Infinity, minutesPerMonth: Infinity, chatsPerDay: Infinity },
};
