import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { BillingService } from './billing.service';
import { UsageService } from './usage.service';
import { checkoutSchema, confirmCheckoutSchema } from './billing.dto';

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

  @Post('checkout/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a completed checkout (sandbox path — verifies with Stripe)' })
  async confirm(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(confirmCheckoutSchema)) body: { sessionId: string },
  ) {
    const workspace = await this.workspaces.getActiveForUser(user.id);
    return this.billing.confirmCheckout(workspace.id, body.sessionId);
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel the subscription at period end' })
  async cancel(@CurrentUser() user: AuthUser) {
    const workspace = await this.workspaces.getActiveForUser(user.id);
    return this.billing.cancelSubscription(workspace.id);
  }

  /**
   * Stripe webhook (production path). Public — authenticity comes from the
   * stripe-signature HMAC, verified against STRIPE_WEBHOOK_SECRET using the raw body.
   */
  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook receiver' })
  async webhook(@Req() req: RawBodyRequest<Request>) {
    const signature = req.headers['stripe-signature'];
    await this.billing.handleWebhookPayload(req.rawBody, Array.isArray(signature) ? signature[0] : signature);
    return { received: true };
  }
}
