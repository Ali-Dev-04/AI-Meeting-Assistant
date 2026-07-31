'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCurrentWorkspace } from '@/lib/api/workspaces';
import { MembersTab } from '@/components/settings/members-tab';
import { BillingTab } from '@/components/settings/billing-tab';

export default function SettingsPage() {
  const workspace = useCurrentWorkspace();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">{workspace?.name ?? 'Your workspace'}</p>
      </div>

      {!workspace ? (
        <p className="text-sm text-muted-foreground">No workspace found for your account.</p>
      ) : (
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
      )}
    </div>
  );
}
