import { Module } from '@nestjs/common';
import { AiModule } from '../../infrastructure/ai/ai.module';
import { BillingModule } from '../billing/billing.module';
import { PipelineService } from './pipeline.service';
import { MeetingProcessor } from './processors/meeting.processor';

/** Worker-only module: orchestrator + BullMQ processor + AI providers. */
@Module({
  imports: [AiModule, BillingModule],
  providers: [PipelineService, MeetingProcessor],
})
export class ProcessingModule {}
