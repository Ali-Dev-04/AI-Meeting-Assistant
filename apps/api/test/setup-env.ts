/**
 * Runs before any test module loads. Sets the env vars `config/env.ts` requires so its
 * fail-fast validation passes in the test process (no real secrets/services needed for unit tests).
 */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test?schema=public';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-0123456789';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-0123456789';
process.env.S3_ENDPOINT = 'http://localhost:9000';
process.env.S3_BUCKET = 'test';
process.env.S3_ACCESS_KEY_ID = 'test';
process.env.S3_SECRET_ACCESS_KEY = 'test';
process.env.ANTHROPIC_API_KEY = 'test-key';
process.env.STT_ENDPOINT = 'http://localhost:8080';
process.env.EMBEDDING_ENDPOINT = 'http://localhost:8081';
