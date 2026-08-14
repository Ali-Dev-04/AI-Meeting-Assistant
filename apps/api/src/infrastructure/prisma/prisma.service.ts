import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Thin wrapper around PrismaClient that connects on app start and disconnects on
 * shutdown. Provided globally so every service injects the same instance.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Prisma');

  constructor() {
    // Log warnings/errors to stdout (no event subscription needed).
    super({ log: ['warn', 'error'] });
  }

  async onModuleInit() {
    // Serverless Postgres (e.g. Neon) occasionally closes fresh connections —
    // retry briefly so worker/API boots survive transient blips.
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.$connect();
        this.logger.log('Connected to PostgreSQL');
        return;
      } catch (error) {
        if (attempt === maxAttempts) throw error;
        this.logger.warn(
          `Postgres connect attempt ${attempt}/${maxAttempts} failed (${(error as Error).message}) — retrying in 2s…`,
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
