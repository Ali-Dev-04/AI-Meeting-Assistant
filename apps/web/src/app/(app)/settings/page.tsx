'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useConfirmCheckout, useCurrentWorkspace, useMembers } from '@/lib/api/workspaces';
import { MembersTab } from '@/components/settings/members-tab';
import { BillingTab } from '@/components/settings/billing-tab';

export default function SettingsPage() {
  const workspace = useCurrentWorkspace();
  const { data: members } = useMembers(workspace?.id ?? '');
  const router = useRouter();
  const searchParams = useSearchParams();
  const confirm = useConfirmCheckout();
  const handled = useRef(false);

  const returningFromCheckout = searchParams.get('checkout') === 'success';

  // Stripe redirects back with ?checkout=success&session_id=… — handle it at PAGE
  // level (not inside the Billing tab) so activation runs no matter which tab is
  // active, or whether the session was restored after the full-page round-trip.
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
    // `confirm` is a stable mutation; param change is the intended trigger.
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your workspace, members, and plan.</p>
      </div>

      {!workspace ? (
        <p className="text-sm text-muted-foreground">No workspace found for your account.</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="space-y-1 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Workspace</p>
              {members ? (
                <p className="truncate text-lg font-semibold">{workspace.name}</p>
              ) : (
                <Skeleton className="h-6 w-24" />
              )}
            </Card>
            <Card className="space-y-1 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Plan</p>
              <p className="text-lg font-semibold capitalize">{workspace.plan.toLowerCase()}</p>
            </Card>
            <Card className="space-y-1 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Members</p>
              {members ? (
                <p className="text-lg font-semibold">{members.length}</p>
              ) : (
                <Skeleton className="h-6 w-10" />
              )}
            </Card>
          </div>

          {/* After checkout, land on the billing tab so the upgrade is visible. */}
          <Tabs defaultValue={returningFromCheckout ? 'billing' : 'members'}>
            <TabsList>
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="billing">Plan &amp; Usage</TabsTrigger>
            </TabsList>
            <TabsContent value="members">
              <MembersTab workspaceId={workspace.id} />
            </TabsContent>
            <TabsContent value="billing">
              <BillingTab />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
