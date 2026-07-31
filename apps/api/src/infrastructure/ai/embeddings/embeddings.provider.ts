import { Injectable } from '@nestjs/common';
import { env } from '../../../config/env';
import { IEmbeddingProvider } from './embeddings.types';

/**
 * Self-hosted embedding provider. Assumes a small HTTP server exposing
 * POST /embed { inputs: string[] } → { embeddings: number[][] }.
 * Swap to OpenAI/Cohere by rebinding EMBEDDING_PROVIDER.
 */
@Injectable()
export class SelfHostedEmbeddingProvider implements IEmbeddingProvider {
  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const response = await fetch(`${env.EMBEDDING_ENDPOINT}/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: texts }),
    });
    if (!response.ok) {
      throw new Error(`Embedding request failed (${response.status})`);
    }
    const data = (await response.json()) as { embeddings: number[][] };
    return data.embeddings;
  }
}
