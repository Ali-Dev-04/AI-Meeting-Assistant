'use client';

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from './client';
import type { SearchMode, SearchResult } from '@ama/shared-types';

export const searchApi = {
  search: (params: { q: string; mode: SearchMode }) =>
    apiRequest<SearchResult[]>('/search', { query: { q: params.q, mode: params.mode } }),
};

/**
 * Global meeting search. `placeholderData` keeps the previous results on screen
 * while a new query runs, so the UI doesn't flash empty between keystrokes.
 */
export function useSearch(params: { q: string; mode: SearchMode }) {
  return useQuery({
    queryKey: ['search', params],
    queryFn: () => searchApi.search(params),
    enabled: params.q.trim().length > 0,
    placeholderData: (previous) => previous,
  });
}
