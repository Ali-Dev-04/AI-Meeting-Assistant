import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { ValidationError } from '../../common/errors';
import { env } from '../../config/env';

/**
 * Stripe checkout. The Stripe client is only created when STRIPE_SECRET_KEY is set,
 * so billing degrades gracefully in dev (checkout returns a clear error instead of
 * crashing the app). Webhooks + subscription state sync land with Phase 16.
 */
@Injectable()
export class BillingService {
  private readonly stripe: Stripe | null;

  constructor() {
    this.stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null;
  }

  async createCheckout(
    workspaceId: string,
    plan: 'PRO' | 'BUSINESS',
  ): Promise<{ url: string }> {
    if (!this.stripe) {
      throw new ValidationError('Billing is not configured on this server (missing STRIPE_SECRET_KEY).');
    }
    const priceId = plan === 'PRO' ? env.STRIPE_PRO_PRICE_ID : env.STRIPE_BUSINESS_PRICE_ID;
    if (!priceId) {
      throw new ValidationError(`No Stripe price is configured for the ${plan} plan.`);
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${env.APP_URL}/settings?checkout=success`,
      cancel_url: `${env.APP_URL}/settings?checkout=cancelled`,
      client_reference_id: workspaceId,
      subscription_data: { metadata: { workspaceId, plan } },
    });

    if (!session.url) throw new ValidationError('Stripe did not return a checkout URL.');
    return { url: session.url };
  }
}
