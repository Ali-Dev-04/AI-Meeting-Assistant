import { Module } from '@nestjs/common';
import { LLM_PROVIDER } from './llm.types';
import { AnthropicProvider } from './anthropic.provider';

@Module({
  providers: [{ provide: LLM_PROVIDER, useClass: AnthropicProvider }],
  exports: [LLM_PROVIDER],
})
export class LlmModule {}
