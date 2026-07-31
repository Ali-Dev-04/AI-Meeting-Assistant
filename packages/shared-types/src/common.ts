/** Shared cross-cutting types. */

/** Matches the API error envelope (docs/api.md §4). */
export interface ApiErrorShape {
  error: {
    code: string;
    message: string;
    details?: Array<Record<string, unknown>>;
    requestId?: string;
  };
}

/** Cursor-based list envelope (docs/api.md §3). */
export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}
