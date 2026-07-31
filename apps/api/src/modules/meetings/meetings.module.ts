import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './meetings.service';
import { ShareController } from './share.controller';

@Module({
  // WorkspacesService + UsageService are needed by MeetingsService.
  // Storage + Queue are @Global, so no import required.
  imports: [WorkspacesModule, BillingModule],
  controllers: [MeetingsController, ShareController],
  providers: [MeetingsService],
  exports: [MeetingsService],
})
export class MeetingsModule {}
