'use client';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCurrentWorkspace, useMembers } from '@/lib/api/workspaces';
import { MembersTab } from '@/components/settings/members-tab';
import { BillingTab } from '@/components/settings/billing-tab';

export default function SettingsPage() {
  const workspace = useCurrentWorkspace();
  const { data: members } = useMembers(workspace?.id ?? '');

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

          <Tabs defaultValue="members">
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
