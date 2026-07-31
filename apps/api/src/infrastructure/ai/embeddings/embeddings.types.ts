/** Provider-agnostic embedding contract. */
export interface IEmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>;
}

export const EMBEDDING_PROVIDER = Symbol('EMBEDDING_PROVIDER');
