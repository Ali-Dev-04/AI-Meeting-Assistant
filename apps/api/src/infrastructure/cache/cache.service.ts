import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

/**
 * Thin Redis cache for hot reads. JSON in/out. Short TTLs (default 60s) keep data
 * fresh while cutting repeated DB hits — e.g. the active-workspace lookup that runs
 * on nearly every authenticated request.
 */
@Injectable()
export class CacheService {
  constructor(private readonly redis: RedisService) {}

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.redis.client.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
    await this.redis.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length > 0) await this.redis.client.del(keys);
  }
}
