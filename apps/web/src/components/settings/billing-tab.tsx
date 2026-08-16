'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  useCancelSubscription,
  useCheckout,
  useConfirmCheckout,
  useUsage,
} from '@/lib/api/workspaces';
import type { PlanTier } from '@ama/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatDate, formatDuration } from '@/lib/utils';

const PLANS: Array<{
  tier: PlanTier;
  price: string;
  meetings: string;
  minutes: string;
}> = [
  { tier: 'FREE', price: '$0', meetings: '5 meetings / mo', minutes: '300 min / mo' },
  { tier: 'PRO', price: '$12', meetings: '50 meetings / mo', minutes: '2,000 min / mo' },
  { tier: 'BUSINESS', price: '$49', meetings: 'Unlimited meetings', minutes: '10,000 min / mo' },
];

export function BillingTab() {
  const { data: usage, isLoading } = useUsage();
  const checkout = useCheckout();
  const confirm = useConfirmCheckout();
  const cancel = useCancelSubscription();
  const router = useRouter();
  const searchParams = useSearchParams();
  const handled = useRef(false);

  // Stripe redirects back with ?checkout=success&session_id=… (or cancelled).
  useEffect(() => {
    if (handled.current) return;
    const status = searchParams.get('checkout');
    const sessionId = searchParams.get('session_id');
    if (status === 'cancelled') {
      handled.current = true;
      toast.info('Checkout cancelled');
      router.replace('/settings');
      return;
    }
    if (status === 'success' && sessionId) {
      handled.current = true;
      confirm.mutate(sessionId, {
        onSuccess: ({ plan }) => {
          toast.success(`Upgraded to ${plan.toLowerCase()} 🎉`);
          router.replace('/settings');
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : 'Could not confirm the upgrade.');
          router.replace('/settings');
        },
      });
    }
    // `confirm` is a stable mutation; re-running on param change is the intended trigger.
  }, [searchParams]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!usage) return <p className="text-sm text-muted-foreground">Usage data unavailable.</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {PLANS.map((plan) => {
          const current = usage.plan === plan.tier;
          const upgradeTarget =
            plan.tier === 'PRO' || (plan.tier === 'BUSINESS' && usage.plan !== 'BUSINESS');
          return (
            <Card
              key={plan.tier}
              className={cn('space-y-2 p-4', current && 'border-primary ring-1 ring-primary')}
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold">{plan.tier.charAt(0) + plan.tier.slice(1).toLowerCase()}</p>
                {current && <Badge>Current</Badge>}
              </div>
              <p className="text-2xl font-semibold">
                {plan.price}
                <span className="text-sm font-normal text-muted-foreground">/mo</span>
              </p>
              <p className="text-xs text-muted-foreground">{plan.meetings}</p>
              <p className="text-xs text-muted-foreground">{plan.minutes}</p>
              {!current && upgradeTarget && (
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => checkout.mutate(plan.tier)}
                  disabled={checkout.isPending}
                >
                  {checkout.isPending ? 'Redirecting…' : `Upgrade to ${plan.tier.toLowerCase()}`}
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      {usage.plan !== 'FREE' && (
        <div className="flex items-center justify-between rounded-lg border p-3">
          <p className="text-sm text-muted-foreground">
            Subscription renews monthly (test mode — use card 4242&nbsp;4242&nbsp;4242&nbsp;4242).
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={cancel.isPending}
            onClick={() =>
              cancel.mutate(undefined, {
                onSuccess: ({ cancelsAt }) =>
                  toast.success(
                    `Subscription will downgrade to free on ${cancelsAt ? formatDate(cancelsAt) : 'period end'}`,
                  ),
                onError: (error) =>
                  toast.error(
                    error instanceof Error ? error.message : 'No active subscription to cancel.',
                  ),
              })
            }
          >
            {cancel.isPending ? 'Cancelling…' : 'Cancel subscription'}
          </Button>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Usage this period
        </h2>
        <UsageBar
          label="Meetings"
          value={usage.meetingCount}
          limit={usage.meetingLimit}
          formatter={(n) => (Number.isFinite(n) ? String(n) : '∞')}
        />
        <UsageBar
          label="Transcription"
          value={usage.transcribedSeconds}
          limit={usage.transcribedLimitSeconds}
          formatter={formatDuration}
        />
      </div>
    </div>
  );
}

function UsageBar({
  label,
  value,
  limit,
  formatter,
}: {
  label: string;
  value: number;
  limit: number;
  formatter: (n: number) => string;
}) {
  const percent = limit > 0 ? Math.min(100, Math.round((value / limit) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {formatter(value)} / {formatter(limit)}
        </span>
      </div>
      <Progress value={percent} />
    </div>
  );
}
