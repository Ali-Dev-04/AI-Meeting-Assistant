'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiRequest } from './client';
import { tokenStore } from '@/lib/auth/token-store';
import type {
  AuthSession,
  AuthTokens,
  ChangePasswordRequest,
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
} from '@ama/shared-types';

/** Low-level auth API calls. */
export const authApi = {
  login: (data: LoginRequest) =>
    apiRequest<AuthTokens>('/auth/login', { method: 'POST', body: data }),
  register: (data: RegisterRequest) =>
    apiRequest<AuthTokens>('/auth/register', { method: 'POST', body: data }),
  me: () => apiRequest<AuthSession>('/auth/me'),
  logout: () => apiRequest<void>('/auth/logout', { method: 'POST' }),
  updateProfile: (data: UpdateProfileRequest) =>
    apiRequest<AuthSession>('/auth/me', { method: 'PATCH', body: data }),
  changePassword: (data: ChangePasswordRequest) =>
    apiRequest<void>('/auth/change-password', { method: 'POST', body: data }),
};

/**
 * Current user. Safe to call on any authenticated page — if the in-memory access
 * token is missing, the API client transparently refreshes via the cookie.
 * retry:false so an auth failure isn't retried (it means "not logged in").
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const session = await authApi.me();
      return session.user;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

/** Settings → Profile: update display name (refreshes the cached session). */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateProfileRequest) => authApi.updateProfile(data),
    onSuccess: (session) => {
      queryClient.setQueryData(['auth', 'me'], session.user);
    },
  });
}

export function useChangePassword() {
  return useMutation({ mutationFn: authApi.changePassword });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: async (tokens) => {
      tokenStore.set(tokens.accessToken);
      await queryClient.invalidateQueries({ queryKey: ['auth'] });
      router.replace('/dashboard');
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: authApi.register,
    onSuccess: async (tokens) => {
      tokenStore.set(tokens.accessToken);
      await queryClient.invalidateQueries({ queryKey: ['auth'] });
      router.replace('/dashboard');
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      // Clear local state regardless of whether the server call succeeded.
      tokenStore.clear();
      queryClient.clear();
      router.replace('/login');
    },
  });
}
