import { z } from 'zod';

/**
 * Auth request/response contracts.
 * These Zod schemas are the single source of truth — the API (Phase 9) and the
 * web app both import them, so a contract change cannot drift between client and server.
 */

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
export type LoginRequest = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .max(128, 'Password is too long'),
});
export type RegisterRequest = z.infer<typeof registerSchema>;

/** Token pair returned by login/refresh. Refresh is httpOnly-cookie based; only the
 *  short-lived access token is exposed to JS. */
export interface AuthTokens {
  accessToken: string;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface AuthSession {
  user: User;
}
