import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../../config/env';
import {
  ActionItemDraft,
  ChatTurn,
  DecisionDraft,
  ILLMProvider,
  InsightsResult,
  TopicDraft,
} from './llm.types';

const SYSTEM_PROMPT = `You are a meeting assistant. Analyze the transcript and respond with ONLY valid JSON (no markdown fences, no commentary) in this exact shape:
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

/**
 * Claude-backed LLM provider. Uses the Messages API and asks for JSON output,
 * which we parse defensively (LLMs occasionally wrap output in prose/fences).
 */
@Injectable()
export class AnthropicProvider implements ILLMProvider {
  private readonly logger = new Logger('Anthropic');
  private readonly client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }

  async extractInsights(transcript: string): Promise<InsightsResult> {
    const response = await this.client.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Transcript:\n\n${transcript}` }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    return this.parse(text);
  }

  async streamAnswer(
    question: string,
    context: string[],
    history: ChatTurn[],
    onToken: (delta: string) => void,
  ): Promise<string> {
    const system =
      'You are a meeting assistant answering questions about ONE specific meeting. ' +
      'Answer using ONLY the provided transcript excerpts. If the answer is not present, ' +
      'say you could not find it in this meeting. You may reference earlier turns in the ' +
      'conversation for context, but stay grounded in the excerpts. Be concise and specific.';
    const contextBlock = context
      .map((excerpt, i) => `[Excerpt ${i + 1}] ${excerpt}`)
      .join('\n\n');

    const messages: Anthropic.MessageParam[] = [
      ...history.map((turn) => ({ role: turn.role, content: turn.content })),
      { role: 'user', content: question },
    ];

    const stream = this.client.messages.stream({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: `${system}\n\nTranscript excerpts:\n${contextBlock}`,
      messages,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        onToken(event.delta.text);
      }
    }

    const final = await stream.finalMessage();
    return final.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');
  }

  private parse(text: string): InsightsResult {
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
      this.logger.error(`Failed to parse LLM output: ${(error as Error).message}`);
      // Fail soft on parse — don't lose the whole meeting over a formatting quirk.
      return { overview: '', keyPoints: [], actionItems: [], decisions: [], topics: [] };
    }
  }
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
function asStringArray(value: unknown): string[] {
  return asArray(value).filter((v): v is string => typeof v === 'string');
}
