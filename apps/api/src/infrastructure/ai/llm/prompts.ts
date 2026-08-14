import { Logger } from '@nestjs/common';
import { ActionItemDraft, DecisionDraft, InsightsResult, TopicDraft } from './llm.types';

/**
 * Prompts + parsing shared by every LLM provider so behaviour can't drift between
 * backends. Extracted verbatim from the original Anthropic provider.
 */

export const INSIGHTS_SYSTEM_PROMPT = `You are a meeting assistant. Analyze the transcript and respond with ONLY valid JSON (no markdown fences, no commentary) in this exact shape:
{
  "overview": string,                 // 2-4 sentence summary of the meeting
  "keyPoints": string[],              // concrete outcomes, not filler
  "actionItems": [{ "text": string, "assigneeText": string | null }],
  "decisions": [{ "text": string, "context": string | null }],
  "topics": [{ "label": string, "summary": string | null }]
}
Rules:
- Be faithful to the transcript. Do NOT invent details, names, or commitments.
- For action items, set assigneeText from phrasing like "X will/needs to/should".
- If a field has no content, return an empty array — never guess.
- Keep each keyPoint and text under ~25 words.`;

export const ANSWER_SYSTEM_PROMPT =
  'You are a meeting assistant answering questions about ONE specific meeting. ' +
  'Answer using ONLY the provided transcript excerpts. If the answer is not present, ' +
  'say you could not find it in this meeting. You may reference earlier turns in the ' +
  'conversation for context, but stay grounded in the excerpts. Be concise and specific.';

export function buildContextBlock(context: string[]): string {
  return context.map((excerpt, i) => `[Excerpt ${i + 1}] ${excerpt}`).join('\n\n');
}

/**
 * Defensive parse of the insights JSON (LLMs occasionally wrap output in prose or
 * markdown fences). Fails SOFT: returns an all-empty result on parse errors so a
 * formatting quirk never loses the whole meeting.
 */
export function parseInsights(text: string, logger: Logger): InsightsResult {
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('No JSON object found in response.');
    const raw = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    return {
      overview: typeof raw.overview === 'string' ? raw.overview : '',
      keyPoints: asStringArray(raw.keyPoints),
      actionItems: asArray(raw.actionItems).map((a) => ({
        text: String((a as Record<string, unknown>).text ?? ''),
        assigneeText: (a as Record<string, unknown>).assigneeText ?? null,
      })) as ActionItemDraft[],
      decisions: asArray(raw.decisions).map((d) => ({
        text: String((d as Record<string, unknown>).text ?? ''),
        context: (d as Record<string, unknown>).context ?? null,
      })) as DecisionDraft[],
      topics: asArray(raw.topics).map((t) => ({
        label: String((t as Record<string, unknown>).label ?? ''),
        summary: (t as Record<string, unknown>).summary ?? null,
      })) as TopicDraft[],
    };
  } catch (error) {
    logger.error(`Failed to parse LLM output: ${(error as Error).message}`);
    // Fail soft on parse — don't lose the whole meeting over a formatting quirk.
    return { overview: '', keyPoints: [], actionItems: [], decisions: [], topics: [] };
  }
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
function asStringArray(value: unknown): string[] {
  return asArray(value).filter((v): v is string => typeof v === 'string');
}
