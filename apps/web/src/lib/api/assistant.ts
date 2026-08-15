'use client';

import { siteConfig } from '@/config/site';
import { tokenStore } from '@/lib/auth/token-store';
import type { AssistantSource } from '@ama/shared-types';

export interface AssistantHandlers {
  onToken: (delta: string) => void;
  onSources: (sources: AssistantSource[]) => void;
  onDone: () => void;
  onError: (message: string) => void;
}

/**
 * Workspace-wide "Ask AI" SSE consumer — same manual frame parsing as chat.ts
 * (fetch-streaming because EventSource can't set the Authorization header).
 * Emits: token → sources → done.
 */
export async function streamAssistant(
  question: string,
  handlers: AssistantHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${siteConfig.apiUrl}/assistant/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      Authorization: `Bearer ${tokenStore.get() ?? ''}`,
    },
    body: JSON.stringify({ question }),
    credentials: 'include',
    signal,
  });
  if (!res.ok || !res.body) {
    throw new Error(`Assistant failed (HTTP ${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? ''; // keep the trailing partial frame

    for (const frame of frames) {
      let event = 'message';
      let data = '';
      for (const line of frame.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data += line.slice(5).trim();
      }
      if (!data) continue;
      try {
        const parsed = JSON.parse(data) as Record<string, unknown>;
        if (event === 'token' && typeof parsed.delta === 'string') handlers.onToken(parsed.delta);
        else if (event === 'sources' && Array.isArray(parsed.sources))
          handlers.onSources(parsed.sources as AssistantSource[]);
        else if (event === 'done') handlers.onDone();
        else if (event === 'error' && typeof parsed.message === 'string') handlers.onError(parsed.message);
      } catch {
        // ignore malformed frames
      }
    }
  }
}
