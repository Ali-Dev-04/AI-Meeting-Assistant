'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from './client';
import type { AppNotification } from '@ama/shared-types';

export const notificationsApi = {
  list: () => apiRequest<{ items: AppNotification[]; unreadCount: number }>('/notifications'),
  markRead: (id: string) =>
    apiRequest<void>(`/notifications/${id}/read`, { method: 'POST' }),
  markAllRead: () => apiRequest<void>('/notifications/read-all', { method: 'POST' }),
};

/** Polled by the header bell. */
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
