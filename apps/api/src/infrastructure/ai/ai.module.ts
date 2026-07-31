import { Module } from '@nestjs/common';
import { LlmModule } from './llm/llm.module';
import { SttModule } from './stt/stt.module';
import { EmbeddingsModule } from './embeddings/embeddings.module';

/** Bundles the three AI capabilities so importers get them together. */
@Module({
  imports: [LlmModule, SttModule, EmbeddingsModule],
  exports: [LlmModule, SttModule, EmbeddingsModule],
})
export class AiModule {}
