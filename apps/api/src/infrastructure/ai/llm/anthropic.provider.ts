import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../../config/env';
import { ChatTurn, ILLMProvider, InsightsResult } from './llm.types';
import {
  ANSWER_SYSTEM_PROMPT,
  buildContextBlock,
  INSIGHTS_SYSTEM_PROMPT,
  parseInsights,
} from './prompts';

/**
 * Claude-backed LLM provider. Uses the Messages API and asks for JSON output,
 * which we parse defensively (LLMs occasionally wrap output in prose/fences).
 * Prompts + parsing are shared with other providers via ./prompts.
 */
@Injectable()
export class AnthropicProvider implements ILLMProvider {
  private readonly logger = new Logger('Anthropic');
  private readonly client: Anthropic;
  readonly modelName = env.ANTHROPIC_MODEL;

  constructor() {
    // The key is required only when this provider is selected (env superRefine) —
    // a placeholder keeps the (unused) instance constructible otherwise.
    this.client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY ?? 'not-configured' });
  }

  async extractInsights(transcript: string): Promise<InsightsResult> {
    const response = await this.client.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 2048,
      system: INSIGHTS_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Transcript:\n\n${transcript}` }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    return parseInsights(text, this.logger);
  }

  async streamAnswer(
    question: string,
    context: string[],
    history: ChatTurn[],
    onToken: (delta: string) => void,
  ): Promise<string> {
    const messages: Anthropic.MessageParam[] = [
      ...history.map((turn) => ({ role: turn.role, content: turn.content })),
      { role: 'user', content: question },
    ];

    const stream = this.client.messages.stream({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: `${ANSWER_SYSTEM_PROMPT}\n\nTranscript excerpts:\n${buildContextBlock(context)}`,
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
}
