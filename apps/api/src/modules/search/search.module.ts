import { Module } from '@nestjs/common';
import { AiModule } from '../../infrastructure/ai/ai.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [AiModule, WorkspacesModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
