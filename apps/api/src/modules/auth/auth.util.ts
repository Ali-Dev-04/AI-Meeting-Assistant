import { createHash, randomBytes, randomUUID } from 'crypto';
import { Response } from 'express';
import { User } from '@prisma/client';
import { env } from '../../config/env';

/** Hash a refresh token before storing it, so a Redis dump never leaks live tokens. */
export const sha256 = (value: string): string =>
  createHash('sha256').update(value).digest('hex');

/** Cryptographically random opaque refresh token. */
export const randomToken = (bytes = 48): string => randomBytes(bytes).toString('base64url');

/** Parse a duration like "15m", "7d", "2h" into seconds (default 7 days). */
export function durationToSeconds(duration: string, fallback = 7 * 24 * 3600): number {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) return fallback;
  const value = Number(match[1]);
  switch (match[2]) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 3600;
    case 'd':
      return value * 86_400;
    default:
      return fallback;
  }
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'workspace'
  );
}

export const shortId = (): string => randomUUID().slice(0, 8);

/** Strip sensitive fields before returning a User to the client. */
export function toUserDto(user: User) {
  return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl };
}

const REFRESH_COOKIE = 'ama_refresh';

export function setRefreshCookie(response: Response, token: string): void {
  response.cookie(REFRESH_COOKIE, token, {
    httpOnly: true, // not readable by JS (XSS-safe)
    secure: env.NODE_ENV === 'production', // requires HTTPS in prod
    sameSite: 'lax', // works for same-site (localhost cross-port, or app+api subdomains)
    // Root path so the cookie reaches BOTH the API (/auth/refresh) and the Next.js
    // web origin, whose edge middleware reads it as the session signal for route
    // gating. Cookie scoping is by domain+path (port-agnostic), so localhost:3000
    // receives it too. httpOnly keeps it JS-unreadable.
    path: '/',
    maxAge: durationToSeconds(env.JWT_REFRESH_EXPIRES_IN) * 1000,
  });
}

export function clearRefreshCookie(response: Response): void {
  response.clearCookie(REFRESH_COOKIE, { path: '/' });
}
