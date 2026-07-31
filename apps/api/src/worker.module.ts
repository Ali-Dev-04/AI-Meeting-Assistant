import { Module } from '@nestjs/common';
import { CacheModule } from './infrastructure/cache/cache.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { StorageModule } from './infrastructure/storage/storage.module';
import { ProcessingModule } from './modules/processing/processing.module';

/**
 * Worker root module. Same infrastructure as the API, but no HTTP. The processing
 * processor + AI providers are imported here, so @Processor classes only run in
 * the worker process — keeping heavy AI work out of the API.
 *
 * Cache/Storage are @Global but must still be imported once per app — PipelineService
 * needs StorageService, and WorkspacesService (via Processing → Billing) needs CacheService.
 */
@Module({
  imports: [PrismaModule, RedisModule, QueueModule, CacheModule, StorageModule, ProcessingModule],
})
export class WorkerModule {}
