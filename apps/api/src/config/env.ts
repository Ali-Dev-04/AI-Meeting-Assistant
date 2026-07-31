import 'dotenv/config';
import { z } from 'zod';

/**
 * Typed, validated environment. Parsed once at import time; the process EXITS if a
 * required variable is missing or malformed. "Fail fast" — never run a misconfigured
 * server silently. (See docs/CODING_STANDARDS.md §4.)
 */
const schema = z.object({
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

  // Object storage (S3-compatible; MinIO locally)
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string(),
  S3_ACCESS_KEY_ID: z.string(),
  S3_SECRET_ACCESS_KEY: z.string(),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(true),

  // AI
  ANTHROPIC_API_KEY: z.string(),
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-5'),
  STT_ENDPOINT: z.string().url(),
  EMBEDDING_ENDPOINT: z.string().url(),
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
