'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from './client';
import type {
  CheckoutSession,
  InviteValues,
  Member,
  PlanTier,
  Usage,
  Workspace,
} from '@ama/shared-types';

export const workspacesApi = {
  list: () => apiRequest<Workspace[]>('/workspaces'),
  members: (id: string) => apiRequest<Member[]>(`/workspaces/${id}/members`),
  invite: (id: string, data: InviteValues) =>
    apiRequest<Member>(`/workspaces/${id}/invitations`, { method: 'POST', body: data }),
  usage: () => apiRequest<Usage>('/billing/usage'),
  checkout: (plan: PlanTier) =>
    apiRequest<CheckoutSession>('/billing/checkout', { method: 'POST', body: { plan } }),
};

export function useWorkspaces() {
  return useQuery({ queryKey: ['workspaces'], queryFn: workspacesApi.list });
}

/** v1 assumption: the user's first workspace is the active one. */
export function useCurrentWorkspace() {
  const { data } = useWorkspaces();
  return data?.[0] ?? null;
}

export function useMembers(workspaceId: string) {
  return useQuery({
    queryKey: ['workspaces', 'members', workspaceId],
    queryFn: () => workspacesApi.members(workspaceId),
    enabled: Boolean(workspaceId),
  });
}

export function useInvite(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InviteValues) => workspacesApi.invite(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces', 'members', workspaceId] });
    },
  });
}

export function useUsage() {
  return useQuery({ queryKey: ['billing', 'usage'], queryFn: workspacesApi.usage });
}

/** Start Stripe checkout and redirect the browser to the hosted page. */
export function useCheckout() {
  return useMutation({
    mutationFn: workspacesApi.checkout,
    onSuccess: (session) => {
      window.location.href = session.url;
    },
  });
}
