import { OnModuleDestroy } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { env } from '../../config/env';

/**
 * Shared Redis client (cache, rate-limit counters, refresh-token whitelist).
 * BullMQ manages its own connections; this is for direct app use.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger('Redis');
  readonly client: Redis;

  constructor() {
    this.client = new Redis(env.REDIS_URL, { lazyConnect: false, maxRetriesPerRequest: null });
    this.client.on('error', (err) => this.logger.error(err.message));
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
