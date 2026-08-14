import { Injectable, Logger } from '@nestjs/common';
import { env } from '../../../config/env';
import { ChatTurn, ILLMProvider, InsightsResult } from './llm.types';
import {
  ANSWER_SYSTEM_PROMPT,
  buildContextBlock,
  INSIGHTS_SYSTEM_PROMPT,
  parseInsights,
} from './prompts';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

/**
 * OpenRouter-backed LLM provider (OpenAI-compatible chat completions). Uses plain
 * fetch — no SDK — so it adds no dependency. Supports real SSE streaming for chat
 * (delta events forwarded to onToken) exactly like the Anthropic provider.
 */
@Injectable()
export class OpenRouterProvider implements ILLMProvider {
  private readonly logger = new Logger('OpenRouter');
  readonly modelName = env.OPENROUTER_MODEL;

  async extractInsights(transcript: string): Promise<InsightsResult> {
    const text = await this.chat(
      [
        { role: 'system', content: INSIGHTS_SYSTEM_PROMPT },
        { role: 'user', content: `Transcript:\n\n${transcript}` },
      ],
      2048,
    );
    return parseInsights(text, this.logger);
  }

  async streamAnswer(
    question: string,
    context: string[],
    history: ChatTurn[],
    onToken: (delta: string) => void,
  ): Promise<string> {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        model: env.OPENROUTER_MODEL,
        max_tokens: 1024,
        stream: true,
        messages: [
          {
            role: 'system',
            content: `${ANSWER_SYSTEM_PROMPT}\n\nTranscript excerpts:\n${buildContextBlock(context)}`,
          },
          ...history.map((turn) => ({ role: turn.role, content: turn.content })),
          { role: 'user', content: question },
        ],
      }),
    });
    if (!res.ok || !res.body) {
      throw new Error(`OpenRouter stream failed (${res.status}): ${await safeText(res)}`);
    }

    // Parse OpenAI-style SSE: lines of `data: {json}` terminated by `data: [DONE]`.
    let full = '';
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? ''; // keep the trailing partial line
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const delta = (JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }> })
            .choices?.[0]?.delta?.content;
          if (typeof delta === 'string' && delta.length > 0) {
            full += delta;
            onToken(delta);
          }
        } catch {
          // Ignore partial/malformed SSE frames — the next chunk completes them.
        }
      }
    }
    return full;
  }

  private async chat(messages: ChatMessage[], maxTokens: number): Promise<string> {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ model: env.OPENROUTER_MODEL, max_tokens: maxTokens, messages }),
    });
    if (!res.ok) {
      throw new Error(`OpenRouter chat failed (${res.status}): ${await safeText(res)}`);
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content ?? '';
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      // Recommended by OpenRouter for app attribution.
      'HTTP-Referer': env.API_BASE_URL,
      'X-Title': 'AI Meeting Assistant',
    };
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 300);
  } catch {
    return '';
  }
}
