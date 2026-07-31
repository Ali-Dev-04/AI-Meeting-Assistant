import { siteConfig } from '@/config/site';
import { tokenStore } from '@/lib/auth/token-store';
import type { ApiErrorShape } from '@ama/shared-types';

const BASE_URL = siteConfig.apiUrl;

/**
 * Typed API error that mirrors the server's error envelope (docs/api.md §4).
 * Thrown by apiRequest() so callers can switch on `code` and show messages uniformly.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown[],
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
};

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

// A single in-flight refresh promise so concurrent 401s share ONE refresh call
// (otherwise N parallel requests would each trigger a refresh — a stampede).
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // sends the httpOnly refresh cookie
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        tokenStore.clear();
        return null;
      }
      const data = (await res.json()) as { accessToken: string };
      tokenStore.set(data.accessToken);
      return data.accessToken;
    } catch {
      tokenStore.clear();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

/**
 * The core fetch wrapper. Handles JSON, auth headers, and ONE transparent
 * access-token refresh + retry on 401.
 */
export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { body, query, headers, ...rest } = opts;

  const doFetch = async (token: string | null): Promise<Response> => {
    const finalHeaders = new Headers(headers);
    finalHeaders.set('Accept', 'application/json');
    if (body !== undefined) finalHeaders.set('Content-Type', 'application/json');
    if (token) finalHeaders.set('Authorization', `Bearer ${token}`);
    return fetch(buildUrl(path, query), {
      ...rest,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });
  };

  let res = await doFetch(tokenStore.get());

  // Transparently refresh once on 401 (skip for auth endpoints to avoid loops).
  if (res.status === 401 && !path.startsWith('/auth/')) {
    const newToken = await refreshAccessToken();
    if (newToken) res = await doFetch(newToken);
  }

  if (!res.ok) {
    let parsed: ApiErrorShape | null = null;
    try {
      parsed = (await res.json()) as ApiErrorShape;
    } catch {
      /* non-JSON error body */
    }
    const err = parsed?.error;
    throw new ApiError(
      res.status,
      err?.code ?? 'UNKNOWN',
      err?.message ?? `Request failed (${res.status})`,
      err?.details,
      err?.requestId,
    );
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
