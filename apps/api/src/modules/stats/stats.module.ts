import { Module } from '@nestjs/common';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [WorkspacesModule],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
