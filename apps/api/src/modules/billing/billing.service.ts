import { Injectable } from '@nestjs/common';
import { PlanTier, SubscriptionStatus } from '@prisma/client';
import Stripe from 'stripe';
import { NotFoundError, ValidationError } from '../../common/errors';
import { env } from '../../config/env';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

type UpgradablePlan = 'PRO' | 'BUSINESS';

/**
 * Stripe subscription billing. The client is only created when STRIPE_SECRET_KEY is
 * set, so billing degrades gracefully in dev. Upgrades activate in TWO ways so the
 * flow works locally without the Stripe CLI:
 *  1. Webhook (production path — needs STRIPE_WEBHOOK_SECRET + raw-body relay), and
 *  2. confirmCheckout (dev/sandbox path — the browser returns with the session id
 *     and the server verifies the session directly with Stripe).
 */
@Injectable()
export class BillingService {
  private readonly stripe: Stripe | null;

  constructor(private readonly prisma: PrismaService) {
    this.stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null;
  }

  async createCheckout(
    workspaceId: string,
    plan: UpgradablePlan,
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
      success_url: `${env.APP_URL}/settings?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.APP_URL}/settings?checkout=cancelled`,
      client_reference_id: workspaceId,
      metadata: { workspaceId, plan },
      subscription_data: { metadata: { workspaceId, plan } },
    });

    if (!session.url) throw new ValidationError('Stripe did not return a checkout URL.');
    return { url: session.url };
  }

  /** Dev/sandbox activation: verify a completed checkout session directly with Stripe. */
  async confirmCheckout(
    workspaceId: string,
    sessionId: string,
  ): Promise<{ plan: PlanTier }> {
    if (!this.stripe) throw new ValidationError('Billing is not configured on this server.');

    const session = await this.stripe.checkout.sessions.retrieve(sessionId);
    if (session.client_reference_id !== workspaceId) {
      throw new ValidationError('This checkout session belongs to a different workspace.');
    }
    if (session.payment_status !== 'paid') {
      throw new ValidationError('Payment is not complete yet.');
    }
    const plan = session.metadata?.plan as UpgradablePlan | undefined;
    if (!plan) throw new ValidationError('Could not determine the plan for this session.');

    await this.activate(workspaceId, {
      plan,
      customerId: typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null,
      subscriptionId: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null,
    });
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    return { plan: workspace?.plan ?? 'FREE' };
  }

  /** Cancel at period end (Stripe's standard cancellation behaviour). */
  async cancelSubscription(workspaceId: string): Promise<{ cancelsAt: string | null }> {
    if (!this.stripe) throw new ValidationError('Billing is not configured on this server.');
    const subscription = await this.prisma.subscription.findUnique({ where: { workspaceId } });
    if (!subscription?.stripeSubscriptionId) {
      throw new NotFoundError('Active subscription');
    }
    const updated = await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
    await this.prisma.subscription.update({
      where: { workspaceId },
      data: { currentPeriodEnd: new Date(updated.current_period_end * 1000) },
    });
    return { cancelsAt: new Date(updated.current_period_end * 1000).toISOString() };
  }

  /** Verify the stripe-signature HMAC and dispatch the event. */
  async handleWebhookPayload(rawBody: Buffer | undefined, signature: string | undefined): Promise<void> {
    if (!this.stripe || !env.STRIPE_WEBHOOK_SECRET) {
      throw new ValidationError('Stripe webhooks are not configured on this server.');
    }
    if (!rawBody || !signature) {
      throw new ValidationError('Missing raw body or stripe-signature header.');
    }
    const event = this.stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    await this.handleWebhook(event);
  }

  /** Verified Stripe webhook (production path). Signature is checked by the controller. */
  async handleWebhook(event: Stripe.Event): Promise<void> {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const workspaceId = session.client_reference_id ?? session.metadata?.workspaceId;
      const plan = session.metadata?.plan as UpgradablePlan | undefined;
      if (workspaceId && plan) {
        await this.activate(workspaceId, {
          plan,
          customerId: typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null,
          subscriptionId: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null,
        });
      }
      return;
    }

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      const workspaceId = sub.metadata?.workspaceId;
      if (!workspaceId) return;
      const record = await this.prisma.subscription.findUnique({ where: { workspaceId } });
      if (!record) return;

      if (event.type === 'customer.subscription.deleted') {
        await this.prisma.$transaction([
          this.prisma.subscription.update({
            where: { workspaceId },
            data: { status: 'CANCELED' },
          }),
          this.prisma.workspace.update({ where: { id: workspaceId }, data: { plan: 'FREE' } }),
        ]);
        return;
      }
      await this.prisma.subscription.update({
        where: { workspaceId },
        data: {
          status: toPrismaStatus(sub.status),
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
        },
      });
    }
  }

  /** Persist the upgrade: workspace plan + subscription record. */
  private async activate(
    workspaceId: string,
    data: { plan: UpgradablePlan; customerId: string | null; subscriptionId: string | null },
  ): Promise<void> {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.workspace.update({ where: { id: workspaceId }, data: { plan: data.plan } }),
      this.prisma.subscription.upsert({
        where: { workspaceId },
        update: {
          plan: data.plan,
          status: 'ACTIVE',
          stripeCustomerId: data.customerId ?? undefined,
          stripeSubscriptionId: data.subscriptionId ?? undefined,
        },
        create: {
          workspaceId,
          plan: data.plan,
          status: 'ACTIVE',
          stripeCustomerId: data.customerId ?? `cus_pending_${workspaceId.slice(0, 8)}`,
          stripeSubscriptionId: data.subscriptionId ?? undefined,
          currentPeriodEnd: new Date(now.getTime() + 30 * 86_400_000),
        },
      }),
    ]);
  }

}

function toPrismaStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'active':
      return 'ACTIVE';
    case 'trialing':
      return 'TRIALING';
    case 'past_due':
    case 'unpaid':
      return 'PAST_DUE';
    case 'canceled':
      return 'CANCELED';
    default:
      return 'INCOMPLETE';
  }
}
