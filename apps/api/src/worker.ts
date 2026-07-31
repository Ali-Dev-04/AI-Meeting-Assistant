import 'reflect-metadata';
import * as Sentry from '@sentry/node';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';
import { env } from './config/env';

/**
 * Worker entrypoint. Uses createApplicationContext (no HTTP listener) so the Nest
 * container starts and the @Processor classes begin consuming queue jobs. Runs as
 * a separate process from the API so heavy AI work scales and fails independently.
 */
async function bootstrap() {
  if (env.SENTRY_DSN) {
    Sentry.init({ dsn: env.SENTRY_DSN, environment: env.NODE_ENV });
  }
  const app = await NestFactory.createApplicationContext(WorkerModule, { bufferLogs: true });
  await app.init();

  const logger = new Logger('Worker');
  logger.log(`🛠️  Worker running (concurrency ${env.BULLMQ_CONCURRENCY})`);

  const shutdown = async (signal: string) => {
    logger.log(`${signal} received, shutting down gracefully…`);
    await app.close();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

void bootstrap();
