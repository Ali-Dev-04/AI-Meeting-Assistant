import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { env } from '../../config/env';
import { QUEUE_NAMES } from './queue.constants';
import { QueueService } from './queue.service';

/** Parse redis(s)://[user:pass@]host:port/db into the options object BullMQ expects. */
function redisConnection(url: string) {
  const parsed = new URL(url);
  const useTls = parsed.protocol === 'rediss:';
  return {
    host: parsed.hostname,
    port: Number(parsed.port) || 6379,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    db: parsed.pathname && parsed.pathname.length > 1 ? Number(parsed.pathname.slice(1)) : undefined,
    ...(useTls ? { tls: {} as Record<string, never> } : {}),
  };
}

@Global()
@Module({
  imports: [
    BullModule.forRoot({ connection: redisConnection(env.REDIS_URL) }),
    BullModule.registerQueue({ name: QUEUE_NAMES.MEETING_PROCESSING }),
  ],
  providers: [QueueService],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
