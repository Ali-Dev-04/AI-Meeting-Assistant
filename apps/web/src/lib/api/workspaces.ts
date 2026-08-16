'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiRequest } from './client';
import type {
  CheckoutSession,
  Invitation,
  InviteValues,
  Member,
  PlanTier,
  UpdateMemberRoleRequest,
  Usage,
  Workspace,
} from '@ama/shared-types';

export const workspacesApi = {
  list: () => apiRequest<Workspace[]>('/workspaces'),
  members: (id: string) => apiRequest<Member[]>(`/workspaces/${id}/members`),
  invite: (id: string, data: InviteValues) =>
    apiRequest<Invitation>(`/workspaces/${id}/invitations`, { method: 'POST', body: data }),
  invitations: (id: string) => apiRequest<Invitation[]>(`/workspaces/${id}/invitations`),
  revokeInvitation: (id: string, invitationId: string) =>
    apiRequest<void>(`/workspaces/${id}/invitations/${invitationId}`, { method: 'DELETE' }),
  updateMemberRole: (id: string, memberId: string, data: UpdateMemberRoleRequest) =>
    apiRequest<void>(`/workspaces/${id}/members/${memberId}`, { method: 'PATCH', body: data }),
  removeMember: (id: string, memberId: string) =>
    apiRequest<void>(`/workspaces/${id}/members/${memberId}`, { method: 'DELETE' }),
  usage: () => apiRequest<Usage>('/billing/usage'),
  checkout: (plan: PlanTier) =>
    apiRequest<CheckoutSession>('/billing/checkout', { method: 'POST', body: { plan } }),
  confirmCheckout: (sessionId: string) =>
    apiRequest<{ plan: PlanTier }>('/billing/checkout/confirm', {
      method: 'POST',
      body: { sessionId },
    }),
  cancelSubscription: () =>
    apiRequest<{ cancelsAt: string | null }>('/billing/cancel', { method: 'POST' }),
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

export function useInvitations(workspaceId: string) {
  return useQuery({
    queryKey: ['workspaces', 'invitations', workspaceId],
    queryFn: () => workspacesApi.invitations(workspaceId),
    enabled: Boolean(workspaceId),
  });
}

export function useInvite(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InviteValues) => workspacesApi.invite(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces', 'invitations', workspaceId] });
    },
  });
}

export function useRevokeInvitation(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) =>
      workspacesApi.revokeInvitation(workspaceId, invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces', 'invitations', workspaceId] });
    },
  });
}

function useInvalidateMembers(workspaceId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['workspaces', 'members', workspaceId] });
    void queryClient.invalidateQueries({ queryKey: ['workspaces'] });
  };
}

export function useUpdateMemberRole(workspaceId: string) {
  const invalidate = useInvalidateMembers(workspaceId);
  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: 'ADMIN' | 'MEMBER' }) =>
      workspacesApi.updateMemberRole(workspaceId, memberId, { role }),
    onSuccess: invalidate,
  });
}

export function useRemoveMember(workspaceId: string) {
  const invalidate = useInvalidateMembers(workspaceId);
  return useMutation({
    mutationFn: (memberId: string) => workspacesApi.removeMember(workspaceId, memberId),
    onSuccess: invalidate,
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
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Checkout failed.');
    },
  });
}

function useInvalidateBilling() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['billing'] });
    void queryClient.invalidateQueries({ queryKey: ['workspaces'] });
  };
}

/** Sandbox activation: verify the returned checkout session with the API. */
export function useConfirmCheckout() {
  const invalidate = useInvalidateBilling();
  return useMutation({
    mutationFn: workspacesApi.confirmCheckout,
    onSuccess: invalidate,
  });
}

export function useCancelSubscription() {
  const invalidate = useInvalidateBilling();
  return useMutation({
    mutationFn: workspacesApi.cancelSubscription,
    onSuccess: invalidate,
  });
}
