import { Injectable } from '@nestjs/common';
import { env } from '../../../config/env';
import { IEmbeddingProvider } from './embeddings.types';
import { embedTextsLocally } from './local-embeddings';

/** In-process deterministic embeddings — see local-embeddings.ts. No external service. */
@Injectable()
export class LocalEmbeddingProvider implements IEmbeddingProvider {
  async embed(texts: string[]): Promise<number[][]> {
    return embedTextsLocally(texts, env.EMBEDDING_DIMENSIONS);
  }
}
