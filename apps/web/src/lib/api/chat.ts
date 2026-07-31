'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { siteConfig } from '@/config/site';
import { tokenStore } from '@/lib/auth/token-store';
import { apiRequest, ApiError } from './client';
import type {
  ChatConversation,
  ChatMessage,
  ChatStreamCitations,
  ChatStreamDone,
  ChatStreamError,
  ChatStreamToken,
} from '@ama/shared-types';

export const chatApi = {
  createConversation: (meetingId: string) =>
    apiRequest<ChatConversation>(`/meetings/${meetingId}/chat/conversations`, { method: 'POST' }),
  listMessages: (meetingId: string, conversationId: string) =>
    apiRequest<ChatMessage[]>(
      `/meetings/${meetingId}/chat/conversations/${conversationId}/messages`,
    ),
};

export function useChatHistory(meetingId: string, conversationId: string | null) {
  return useQuery({
    queryKey: ['meetings', 'chat', conversationId],
    queryFn: () => chatApi.listMessages(meetingId, conversationId as string),
    enabled: Boolean(conversationId),
  });
}

export function useCreateConversation() {
  return useMutation({ mutationFn: chatApi.createConversation });
}

export interface ChatStreamHandlers {
  onToken: (delta: string) => void;
  onCitations?: (segmentIndexes: number[]) => void;
  onDone?: (messageId: string) => void;
  onError?: (message: string) => void;
}

interface StreamArgs {
  meetingId: string;
  conversationId: string;
  question: string;
  signal?: AbortSignal;
}

/**
 * Stream a chat answer over Server-Sent Events.
 *
 * We use the Fetch API's streaming body (ReadableStream) and parse SSE frames
 * manually: frames are separated by a blank line (`\n\n`), each containing
 * `event:` and `data:` lines. This avoids an extra SSE client dependency and
 * works with our Bearer-auth header (the native EventSource API can't set
 * Authorization headers).
 */
export async function streamChat(args: StreamArgs, handlers: ChatStreamHandlers): Promise<void> {
  const res = await fetch(
    `${siteConfig.apiUrl}/meetings/${args.meetingId}/chat/conversations/${args.conversationId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        Authorization: `Bearer ${tokenStore.get() ?? ''}`,
      },
      body: JSON.stringify({ question: args.question }),
      credentials: 'include',
      signal: args.signal,
    },
  );

  if (!res.ok || !res.body) {
    throw new ApiError(res.status, 'STREAM_ERROR', `Chat failed (HTTP ${res.status}).`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const dispatch = (raw: string) => {
    let event = 'message';
    let data = '';
    for (const line of raw.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data += line.slice(5).trim();
    }
    if (!data) return;
    let payload: unknown;
    try {
      payload = JSON.parse(data);
    } catch {
      return;
    }
    switch (event) {
      case 'token':
        handlers.onToken((payload as ChatStreamToken).delta);
        break;
      case 'citations':
        handlers.onCitations?.((payload as ChatStreamCitations).segmentIndexes);
        break;
      case 'done':
        handlers.onDone?.((payload as ChatStreamDone).messageId);
        break;
      case 'error':
        handlers.onError?.((payload as ChatStreamError).message);
        break;
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let separator: number;
    while ((separator = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, separator);
      buffer = buffer.slice(separator + 2);
      dispatch(rawEvent);
    }
  }
}
