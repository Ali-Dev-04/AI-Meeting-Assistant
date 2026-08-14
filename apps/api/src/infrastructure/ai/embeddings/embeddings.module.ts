import { Module } from '@nestjs/common';
import { env } from '../../../config/env';
import { EMBEDDING_PROVIDER } from './embeddings.types';
import { SelfHostedEmbeddingProvider } from './embeddings.provider';
import { LocalEmbeddingProvider } from './local.provider';

/** Binds the embeddings token to the provider selected via EMBEDDING_PROVIDER (self-hosted | local). */
@Module({
  providers: [
    SelfHostedEmbeddingProvider,
    LocalEmbeddingProvider,
    {
      provide: EMBEDDING_PROVIDER,
      useFactory: (selfHosted: SelfHostedEmbeddingProvider, local: LocalEmbeddingProvider) =>
        env.EMBEDDING_PROVIDER === 'self-hosted' ? selfHosted : local,
      inject: [SelfHostedEmbeddingProvider, LocalEmbeddingProvider],
    },
  ],
  exports: [EMBEDDING_PROVIDER],
})
export class EmbeddingsModule {}
