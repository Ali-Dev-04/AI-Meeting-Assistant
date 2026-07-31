'use client';

import { useCheckout, useUsage } from '@/lib/api/workspaces';
import type { PlanTier } from '@ama/shared-types';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDuration } from '@/lib/utils';

export function BillingTab() {
  const { data: usage, isLoading } = useUsage();
  const checkout = useCheckout();

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!usage) return <p className="text-sm text-muted-foreground">Usage data unavailable.</p>;

  const upgradeTarget: PlanTier | null =
    usage.plan === 'FREE' ? 'PRO' : usage.plan === 'PRO' ? 'BUSINESS' : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Current plan</p>
          <p className="text-lg font-semibold capitalize">{usage.plan.toLowerCase()}</p>
        </div>
        {upgradeTarget && (
          <Button onClick={() => checkout.mutate(upgradeTarget)} disabled={checkout.isPending}>
            {checkout.isPending ? 'Redirecting…' : `Upgrade to ${upgradeTarget.toLowerCase()}`}
          </Button>
        )}
      </div>

      <UsageBar
        label="Meetings this period"
        value={usage.meetingCount}
        limit={usage.meetingLimit}
        formatter={(n) => String(n)}
      />
      <UsageBar
        label="Transcription"
        value={usage.transcribedSeconds}
        limit={usage.transcribedLimitSeconds}
        formatter={formatDuration}
      />
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
