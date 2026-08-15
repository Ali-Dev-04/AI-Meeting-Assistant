import { Module } from '@nestjs/common';
import { AiModule } from '../../infrastructure/ai/ai.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';

/** Cross-meeting "Ask AI" (stateless RAG over all workspace meetings). */
@Module({
  imports: [WorkspacesModule, AiModule],
  controllers: [AssistantController],
  providers: [AssistantService],
})
export class AssistantModule {}
