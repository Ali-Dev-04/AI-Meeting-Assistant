import { Module } from '@nestjs/common';
import { env } from '../../../config/env';
import { LLM_PROVIDER } from './llm.types';
import { AnthropicProvider } from './anthropic.provider';
import { OpenRouterProvider } from './openrouter.provider';

/** Binds the LLM token to the provider selected via LLM_PROVIDER (openrouter | anthropic). */
@Module({
  providers: [
    AnthropicProvider,
    OpenRouterProvider,
    {
      provide: LLM_PROVIDER,
      useFactory: (anthropic: AnthropicProvider, openrouter: OpenRouterProvider) =>
        env.LLM_PROVIDER === 'anthropic' ? anthropic : openrouter,
      inject: [AnthropicProvider, OpenRouterProvider],
    },
  ],
  exports: [LLM_PROVIDER],
})
export class LlmModule {}
