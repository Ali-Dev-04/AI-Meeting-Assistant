import { Module } from '@nestjs/common';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { UsageService } from './usage.service';

@Module({
  imports: [WorkspacesModule],
  controllers: [BillingController],
  providers: [UsageService, BillingService],
  exports: [UsageService],
})
export class BillingModule {}
