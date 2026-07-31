import { z } from 'zod';

export const chatRoleSchema = z.enum(['USER', 'ASSISTANT']);
export type ChatRole = z.infer<typeof chatRoleSchema>;

export interface ChatConversation {
  id: string;
  meetingId: string;
  title: string | null;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: ChatRole;
  content: string;
  /** TranscriptSegment.index values the answer is grounded in (citations). */
  citedSegmentIds: number[];
  createdAt: string;
}

export const askQuestionSchema = z.object({
  question: z.string().trim().min(1, 'Ask a question').max(2000, 'Question is too long'),
});
export type AskQuestion = z.infer<typeof askQuestionSchema>;

/**
 * SSE event payloads sent by POST .../messages (text/event-stream).
 * See docs/api.md §8 for the wire format.
 */
export interface ChatStreamToken {
  delta: string;
}
export interface ChatStreamCitations {
  segmentIndexes: number[];
}
export interface ChatStreamDone {
  messageId: string;
}
export interface ChatStreamError {
  message: string;
}
