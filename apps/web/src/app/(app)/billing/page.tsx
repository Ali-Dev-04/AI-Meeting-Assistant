'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useConfirmCheckout } from '@/lib/api/workspaces';
import { BillingTab } from '@/components/settings/billing-tab';

/** Billing module: plan cards, upgrades (Stripe sandbox), usage, cancel. */
export default function BillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const confirm = useConfirmCheckout();
  const handled = useRef(false);

  // Stripe redirects back here with ?checkout=success&session_id=… (or cancelled).
  useEffect(() => {
    if (handled.current) return;
    const status = searchParams.get('checkout');
    const sessionId = searchParams.get('session_id');
    if (status === 'cancelled') {
      handled.current = true;
      toast.info('Checkout cancelled');
      router.replace('/billing');
      return;
    }
    if (status === 'success' && sessionId) {
      handled.current = true;
      confirm.mutate(sessionId, {
        onSuccess: ({ plan }) => {
          toast.success(`Upgraded to ${plan.toLowerCase()} 🎉`);
          router.replace('/billing');
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : 'Could not confirm the upgrade.');
          router.replace('/billing');
        },
      });
    }
    // `confirm` is a stable mutation; param change is the intended trigger.
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Plans, upgrades, and usage. Test mode — use card 4242&nbsp;4242&nbsp;4242&nbsp;4242.
        </p>
      </div>
      <BillingTab />
    </div>
  );
}
