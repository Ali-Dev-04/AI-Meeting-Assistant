import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser} from '../auth/decorators/current-user.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { BillingService } from './billing.service';
import { UsageService } from './usage.service';
import { checkoutSchema } from './billing.dto';

@ApiTags('Billing')
@Controller('billing')
export class BillingController {
  constructor(
    private readonly usage: UsageService,
    private readonly billing: BillingService,
    private readonly workspaces: WorkspacesService,
  ) {}

  @Get('usage')
  @ApiOperation({ summary: 'Current-period usage vs plan limits' })
  async getUsage(@CurrentUser() user: AuthUser) {
    const workspace = await this.workspaces.getActiveForUser(user.id);
    return this.usage.getCurrentUsage(workspace.id);
  }

  @Post('checkout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start a Stripe checkout session' })
  async checkout(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(checkoutSchema)) body: { plan: 'PRO' | 'BUSINESS' },
  ) {
    const workspace = await this.workspaces.getActiveForUser(user.id);
    return this.billing.createCheckout(workspace.id, body.plan);
  }
}
