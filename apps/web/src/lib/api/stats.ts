'use client';

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from './client';
import type { DashboardStats } from '@ama/shared-types';

export const statsApi = {
  get: () => apiRequest<DashboardStats>('/stats'),
};

/** Dashboard overview numbers; polled so processing/upgrades reflect live. */
export function useDashboardStats() {
  return useQuery({
    queryKey: ['stats', 'dashboard'],
    queryFn: statsApi.get,
    refetchInterval: 15_000,
  });
}
