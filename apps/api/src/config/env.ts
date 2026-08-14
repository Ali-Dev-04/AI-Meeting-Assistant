import 'dotenv/config';
import { z } from 'zod';

/**
 * Typed, validated environment. Parsed once at import time; the process EXITS if a
 * required variable is missing or malformed. "Fail fast" — never run a misconfigured
 * server silently. (See docs/CODING_STANDARDS.md §4.)
 *
 * AI + storage backends are selected via env so the same code runs against real
 * services (S3/MinIO, self-hosted Whisper, Anthropic) or the built-in zero-dependency
 * providers (local filesystem storage, demo STT, local embeddings, OpenRouter LLM).
 * Provider-specific credentials are conditionally required (see superRefine).
 */
const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(4000),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

    DATABASE_URL: z.string().url(),
    DIRECT_URL: z.string().url().optional(),

    REDIS_URL: z.string().url(),

    JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be set'),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be set'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

    CORS_ORIGINS: z.string().default('http://localhost:3000'),

    // Object storage: S3-compatible (AWS/MinIO) or local filesystem (no service needed).
    STORAGE_PROVIDER: z.enum(['s3', 'local']).default('local'),
    S3_ENDPOINT: z.string().url().optional(),
    S3_REGION: z.string().default('us-east-1'),
    S3_BUCKET: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_FORCE_PATH_STYLE: z.coerce.boolean().default(true),
    // Local-storage mode: where files live on disk + this API's own base URL (for signed URLs).
    LOCAL_STORAGE_DIR: z.string().default('data/uploads'),
    API_BASE_URL: z.string().url().default('http://localhost:4000'),

    // LLM: OpenRouter (OpenAI-compatible aggregator) or Anthropic.
    LLM_PROVIDER: z.enum(['openrouter', 'anthropic']).default('openrouter'),
    OPENROUTER_API_KEY: z.string().optional(),
    OPENROUTER_MODEL: z.string().default('openai/gpt-oss-20b:free'),
    ANTHROPIC_API_KEY: z.string().optional(),
    ANTHROPIC_MODEL: z.string().default('claude-sonnet-5'),

    // Speech-to-text: self-hosted Whisper service or built-in demo (scripted transcripts).
    STT_PROVIDER: z.enum(['whisper', 'demo']).default('demo'),
    STT_ENDPOINT: z.string().url().optional(),

    // Embeddings: self-hosted service or built-in local (deterministic hashed vectors).
    EMBEDDING_PROVIDER: z.enum(['self-hosted', 'local']).default('local'),
    EMBEDDING_ENDPOINT: z.string().url().optional(),
    EMBEDDING_MODEL: z.string().default('BAAI/bge-small-en-v1.5'),
    EMBEDDING_DIMENSIONS: z.coerce.number().default(384),

    BULLMQ_CONCURRENCY: z.coerce.number().default(4),

    // App URL + billing (billing is disabled in dev without a Stripe key)
    APP_URL: z.string().url().default('http://localhost:3000'),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_PRO_PRICE_ID: z.string().optional(),
    STRIPE_BUSINESS_PRICE_ID: z.string().optional(),

    // Observability (optional)
    SENTRY_DSN: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    const need = (missing: boolean, field: string, message: string) => {
      if (missing) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message });
    };
    if (v.LLM_PROVIDER === 'openrouter') {
      need(!v.OPENROUTER_API_KEY, 'OPENROUTER_API_KEY', 'Required when LLM_PROVIDER=openrouter');
    }
    if (v.LLM_PROVIDER === 'anthropic') {
      need(!v.ANTHROPIC_API_KEY, 'ANTHROPIC_API_KEY', 'Required when LLM_PROVIDER=anthropic');
    }
    if (v.STT_PROVIDER === 'whisper') {
      need(!v.STT_ENDPOINT, 'STT_ENDPOINT', 'Required when STT_PROVIDER=whisper');
    }
    if (v.EMBEDDING_PROVIDER === 'self-hosted') {
      need(
        !v.EMBEDDING_ENDPOINT,
        'EMBEDDING_ENDPOINT',
        'Required when EMBEDDING_PROVIDER=self-hosted',
      );
    }
    if (v.STORAGE_PROVIDER === 's3') {
      need(!v.S3_ENDPOINT, 'S3_ENDPOINT', 'Required when STORAGE_PROVIDER=s3');
      need(!v.S3_BUCKET, 'S3_BUCKET', 'Required when STORAGE_PROVIDER=s3');
      need(!v.S3_ACCESS_KEY_ID, 'S3_ACCESS_KEY_ID', 'Required when STORAGE_PROVIDER=s3');
      need(!v.S3_SECRET_ACCESS_KEY, 'S3_SECRET_ACCESS_KEY', 'Required when STORAGE_PROVIDER=s3');
    }
  });

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:\n', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;

/** CORS origins as an array, split from the comma-separated env var. */
export const corsOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
