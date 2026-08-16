'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from './client';
import { siteConfig } from '@/config/site';
import { tokenStore } from '@/lib/auth/token-store';
import type {
  ActionItem,
  ActionItemStatus,
  Comment,
  CreateCommentRequest,
  CreateMeetingRequest,
  CreateMeetingResponse,
  CreateShareLinkRequest,
  Decision,
  ImportMeetingRequest,
  Meeting,
  MeetingListParams,
  MeetingPlayback,
  PaginatedResponse,
  ShareLink,
  SharedMeetingView,
  Summary,
  Task,
  Topic,
  Transcript,
} from '@ama/shared-types';

export const meetingsApi = {
  list: (params: MeetingListParams = {}) =>
    apiRequest<PaginatedResponse<Meeting>>('/meetings', {
      query: {
        cursor: params.cursor,
        limit: params.limit,
        status: params.status,
        q: params.q,
      },
    }),
  get: (id: string) => apiRequest<Meeting>(`/meetings/${id}`),
  create: (data: CreateMeetingRequest) =>
    apiRequest<CreateMeetingResponse>('/meetings', { method: 'POST', body: data }),
  complete: (id: string) => apiRequest<Meeting>(`/meetings/${id}/complete`, { method: 'POST' }),
  remove: (id: string) => apiRequest<void>(`/meetings/${id}`, { method: 'DELETE' }),
  importFromUrl: (data: ImportMeetingRequest) =>
    apiRequest<Meeting>('/meetings/import', { method: 'POST', body: data }),

  // Meeting content (each loaded lazily when its tab is opened).
  summary: (id: string) => apiRequest<Summary>(`/meetings/${id}/summary`),
  updateSummary: (meetingId: string, patch: { overview?: string; keyPoints?: string[] }) =>
    apiRequest<Summary>(`/meetings/${meetingId}/summary`, { method: 'PATCH', body: patch }),
  transcript: (id: string) => apiRequest<Transcript>(`/meetings/${id}/transcript`),
  playback: (id: string) => apiRequest<MeetingPlayback>(`/meetings/${id}/media`),
  actionItems: (id: string) => apiRequest<ActionItem[]>(`/meetings/${id}/action-items`),
  decisions: (id: string) => apiRequest<Decision[]>(`/meetings/${id}/decisions`),
  topics: (id: string) => apiRequest<Topic[]>(`/meetings/${id}/topics`),
  comments: (id: string) => apiRequest<Comment[]>(`/meetings/${id}/comments`),
  createComment: (meetingId: string, data: CreateCommentRequest) =>
    apiRequest<Comment>(`/meetings/${meetingId}/comments`, { method: 'POST', body: data }),
  deleteComment: (meetingId: string, commentId: string) =>
    apiRequest<void>(`/meetings/${meetingId}/comments/${commentId}`, { method: 'DELETE' }),
  shareLinks: (id: string) => apiRequest<ShareLink[]>(`/meetings/${id}/share-links`),
  createShareLink: (meetingId: string, data: CreateShareLinkRequest) =>
    apiRequest<ShareLink>(`/meetings/${meetingId}/share-links`, { method: 'POST', body: data }),
  revokeShareLink: (meetingId: string, linkId: string) =>
    apiRequest<void>(`/meetings/${meetingId}/share-links/${linkId}`, { method: 'DELETE' }),
  updateActionItem: (
    meetingId: string,
    itemId: string,
    patch: { status?: ActionItemStatus; assigneeUserId?: string | null; dueDate?: string | null },
  ) =>
    apiRequest<ActionItem>(`/meetings/${meetingId}/action-items/${itemId}`, {
      method: 'PATCH',
      body: patch,
    }),
};

const PAGE_SIZE = 20;

/**
 * Cursor-paginated meetings list. useInfiniteQuery chains pages; "Load more"
 * fetches the next cursor. The query key includes the filters so changing them
 * re-fetches from scratch.
 */
export function useMeetings(params: Omit<MeetingListParams, 'cursor' | 'limit'> = {}) {
  return useInfiniteQuery({
    queryKey: ['meetings', 'list', params],
    queryFn: ({ pageParam }) =>
      meetingsApi.list({ ...params, cursor: pageParam, limit: PAGE_SIZE }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.hasMore && last.nextCursor ? last.nextCursor : undefined),
  });
}

export function useMeeting(id: string) {
  return useQuery({
    queryKey: ['meetings', 'detail', id],
    queryFn: () => meetingsApi.get(id),
    enabled: Boolean(id),
  });
}

export function useMeetingSummary(id: string) {
  return useQuery({
    queryKey: ['meetings', 'summary', id],
    queryFn: () => meetingsApi.summary(id),
    enabled: Boolean(id),
  });
}

/** Optimistically save edits to the summary; roll back on error. */
export function useUpdateSummary(meetingId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['meetings', 'summary', meetingId] as const;

  return useMutation({
    mutationFn: (patch: { overview?: string; keyPoints?: string[] }) =>
      meetingsApi.updateSummary(meetingId, patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Summary>(queryKey);
      if (previous) {
        queryClient.setQueryData<Summary>(queryKey, {
          overview: patch.overview ?? previous.overview,
          keyPoints: patch.keyPoints ?? previous.keyPoints,
        });
      }
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useMeetingTranscript(id: string) {
  return useQuery({
    queryKey: ['meetings', 'transcript', id],
    queryFn: () => meetingsApi.transcript(id),
    enabled: Boolean(id),
  });
}

export function useMeetingPlayback(id: string) {
  return useQuery({
    queryKey: ['meetings', 'playback', id],
    queryFn: () => meetingsApi.playback(id),
    enabled: Boolean(id),
  });
}

export function useMeetingActionItems(id: string) {
  return useQuery({
    queryKey: ['meetings', 'action-items', id],
    queryFn: () => meetingsApi.actionItems(id),
    enabled: Boolean(id),
  });
}

export function useMeetingDecisions(id: string) {
  return useQuery({
    queryKey: ['meetings', 'decisions', id],
    queryFn: () => meetingsApi.decisions(id),
    enabled: Boolean(id),
  });
}

export function useMeetingTopics(id: string) {
  return useQuery({
    queryKey: ['meetings', 'topics', id],
    queryFn: () => meetingsApi.topics(id),
    enabled: Boolean(id),
  });
}

/**
 * Optimistically toggle an action item's status: the UI flips instantly, and we
 * roll back if the server rejects. Cancellation avoids clobbering an in-flight refetch.
 */
type ActionItemPatch = {
  status?: ActionItemStatus;
  assigneeUserId?: string | null;
  dueDate?: string | null;
};

export function useUpdateActionItem(meetingId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['meetings', 'action-items', meetingId] as const;

  return useMutation({
    mutationFn: ({ itemId, ...patch }: { itemId: string } & ActionItemPatch) =>
      meetingsApi.updateActionItem(meetingId, itemId, patch),
    onMutate: async ({ itemId, ...patch }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ActionItem[]>(queryKey);
      if (previous) {
        queryClient.setQueryData<ActionItem[]>(
          queryKey,
          previous.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
        );
      }
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      // Tasks page mirrors action items — keep it in sync.
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export const tasksApi = {
  list: (params: { status?: ActionItemStatus; scope?: 'mine' | 'unassigned' | 'all' } = {}) =>
    apiRequest<{ items: Task[] }>('/tasks', {
      query: { status: params.status, scope: params.scope },
    }),
};

/** Cross-meeting action items (mine | unassigned | all). */
export function useMyTasks(
  params: { status?: ActionItemStatus; scope?: 'mine' | 'unassigned' | 'all' } = {},
) {
  return useQuery({
    queryKey: ['tasks', 'list', params],
    queryFn: () => tasksApi.list(params),
  });
}

// ---- Comments & highlights ----

export function useMeetingComments(id: string) {
  return useQuery({
    queryKey: ['meetings', 'comments', id],
    queryFn: () => meetingsApi.comments(id),
    enabled: Boolean(id),
  });
}

export function useCreateComment(meetingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCommentRequest) => meetingsApi.createComment(meetingId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meetings', 'comments', meetingId] }),
  });
}

/** Optimistically remove the comment; roll back on error. */
export function useDeleteComment(meetingId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['meetings', 'comments', meetingId] as const;
  return useMutation({
    mutationFn: (commentId: string) => meetingsApi.deleteComment(meetingId, commentId),
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Comment[]>(queryKey);
      if (previous) {
        queryClient.setQueryData<Comment[]>(queryKey, previous.filter((c) => c.id !== commentId));
      }
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}

// ---- Share links ----

export function useShareLinks(id: string) {
  return useQuery({
    queryKey: ['meetings', 'share-links', id],
    queryFn: () => meetingsApi.shareLinks(id),
    enabled: Boolean(id),
  });
}

export function useCreateShareLink(meetingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateShareLinkRequest) => meetingsApi.createShareLink(meetingId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meetings', 'share-links', meetingId] }),
  });
}

export function useRevokeShareLink(meetingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (linkId: string) => meetingsApi.revokeShareLink(meetingId, linkId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meetings', 'share-links', meetingId] }),
  });
}

/**
 * Public read-only view. Uses a raw fetch (NOT apiRequest, which attaches the
 * bearer token) — the share endpoint is unauthenticated and resolved by token.
 */
export async function fetchSharedView(token: string): Promise<SharedMeetingView> {
  const res = await fetch(`${siteConfig.apiUrl}/share/${encodeURIComponent(token)}`);
  if (!res.ok) throw new Error(res.status === 404 ? 'not-found' : 'Failed to load shared meeting.');
  return (await res.json()) as SharedMeetingView;
}

/**
 * Download a file export (markdown/srt) with the auth header attached, then hand
 * the blob to the browser as a save. Plain links can't carry Authorization, so
 * this fetch → object-URL → anchor-click dance is required.
 */
export async function downloadMeetingExport(
  meetingId: string,
  kind: 'markdown' | 'srt',
): Promise<void> {
  const token = tokenStore.get();
  const res = await fetch(`${siteConfig.apiUrl}/meetings/${meetingId}/export/${kind}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Export failed (HTTP ${res.status})`);

  const disposition = res.headers.get('Content-Disposition') ?? '';
  const filename = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? `meeting.${kind === 'srt' ? 'srt' : 'md'}`;
  const url = URL.createObjectURL(await res.blob());
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function useCreateMeeting() {
  return useMutation({ mutationFn: meetingsApi.create });
}

/** After upload completes, invalidate the list so the new (QUEUED) meeting appears. */
export function useCompleteUpload() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: meetingsApi.complete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });
}

/** URL import — the pipeline picks it up like any other meeting. */
export function useImportMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: meetingsApi.importFromUrl,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });
}

/** Soft-delete a meeting (e.g. a stuck-QUEUED one); refresh everything that shows meetings. */
export function useDeleteMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: meetingsApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}
