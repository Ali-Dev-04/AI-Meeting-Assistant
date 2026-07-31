'use client';

/**
 * Access-token storage.
 *
 * The access token is short-lived (15m) and held in MEMORY only — not localStorage.
 * The refresh token lives in an httpOnly cookie set by the API, so it is never readable by
 * JavaScript (XSS cannot steal it). This is the secure SPA pattern (see Phase 12).
 *
 * Trade-off: the token is lost on full page reload — that's fine, because on reload the app
 * silently calls /auth/refresh (using the cookie) to mint a new access token.
 */
let accessToken: string | null = null;

export const tokenStore = {
  get: (): string | null => accessToken,
  set: (token: string | null): void => {
    accessToken = token;
  },
  clear: (): void => {
    accessToken = null;
  },
};
