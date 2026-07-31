import { z } from 'zod';

export const searchModeSchema = z.enum(['keyword', 'semantic', 'hybrid']);
export type SearchMode = z.infer<typeof searchModeSchema>;

/** A single ranked search result pointing back to a meeting. */
export interface SearchResult {
  meetingId: string;
  meetingTitle: string;
  occurredAt: string;
  /** Relevance score 0..1 (higher is better). */
  score: number;
  /** Context snippet around the match (may include highlight markers). */
  snippet: string;
  /** TranscriptSegment.index of the best match, for deep-linking. */
  matchedSegmentIndex: number | null;
}
