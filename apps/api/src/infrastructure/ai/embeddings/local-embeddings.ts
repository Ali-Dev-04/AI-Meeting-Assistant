/**
 * Deterministic local embeddings — hashed bag-of-words vectors. No model, no service:
 * tokens (words + word bigrams) are FNV-1a-hashed into a fixed number of buckets and
 * the counts are L2-normalized, so cosine similarity behaves like a weighted
 * bag-of-words overlap. Good enough to run semantic search + chat RAG in local/dev
 * demos; swap in a real model via EMBEDDING_PROVIDER=self-hosted for production.
 *
 * Pure module (no env imports) so the seed script can reuse it directly.
 * Same text always yields the same vector — no randomness anywhere.
 */

const STOPWORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was',
  'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'new', 'now',
  'old', 'see', 'two', 'way', 'who', 'did', 'yes', 'that', 'this', 'with', 'they',
  'from', 'have', 'will', 'been', 'were', 'what', 'when', 'your', 'them', 'then',
  'there', 'these', 'those', 'about', 'would', 'could', 'should', 'into', 'just',
  'like', 'some', 'more', 'very', 'also', 'because', 'while', 'where', 'which',
]);

function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0; // force unsigned 32-bit
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

export function embedTextsLocally(texts: string[], dimensions: number): number[][] {
  if (texts.length === 0) return [];
  return texts.map((text) => {
    const tokens = tokenize(text);

    // Accumulate bucket weights in a map first (sparse), then densify.
    const counts = new Map<number, number>();
    const add = (hash: number, weight: number) => {
      counts.set(hash, (counts.get(hash) ?? 0) + weight);
    };
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]!;
      add(fnv1a(token) % dimensions, 1);
      // Bigrams capture a little phrase structure ("usage_based", "pricing_tiers").
      const prev = tokens[i - 1];
      if (prev !== undefined) add(fnv1a(`${prev}_${token}`) % dimensions, 0.5);
    }

    const vector = new Array<number>(dimensions).fill(0);
    for (const [index, weight] of counts) vector[index] = weight;

    // L2 normalize — pgvector cosine distance (<=>) in search/chat expects unit vectors.
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    return norm === 0 ? vector : vector.map((v) => v / norm);
  });
}
