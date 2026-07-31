import { Module } from '@nestjs/common';
import { EMBEDDING_PROVIDER } from './embeddings.types';
import { SelfHostedEmbeddingProvider } from './embeddings.provider';

@Module({
  providers: [{ provide: EMBEDDING_PROVIDER, useClass: SelfHostedEmbeddingProvider }],
  exports: [EMBEDDING_PROVIDER],
})
export class EmbeddingsModule {}
