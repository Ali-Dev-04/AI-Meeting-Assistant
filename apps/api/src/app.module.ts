import { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { BillingModule } from './modules/billing/billing.module';
import { MeetingsModule } from './modules/meetings/meetings.module';
import { SearchModule } from './modules/search/search.module';
import { ChatModule } from './modules/chat/chat.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { StatsModule } from './modules/stats/stats.module';
import { StorageModule } from './infrastructure/storage/storage.module';
import { CacheModule } from './infrastructure/cache/cache.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

/**
 * API root module. Feature modules (auth, meetings, search, chat, billing…) are
 * imported here as they are built. Infra modules are @Global, so they're available
 * everywhere once imported.
 */
@Module({
  imports: [
    PrismaModule,
    RedisModule,
    QueueModule,
    StorageModule,
    CacheModule,
    HealthModule,
    AuthModule,
    WorkspacesModule,
    BillingModule,
    MeetingsModule,
    SearchModule,
    ChatModule,
    TasksModule,
    NotificationsModule,
    StatsModule,
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
