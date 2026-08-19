'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCurrentWorkspace, useMembers } from '@/lib/api/workspaces';
import { ProfileTab } from '@/components/settings/profile-tab';
import { MembersTab } from '@/components/settings/members-tab';

/** Settings: your profile + workspace management. Billing lives at /billing. */
export default function SettingsPage() {
  const workspace = useCurrentWorkspace();
  const { data: members } = useMembers(workspace?.id ?? '');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Your profile and workspace management.</p>
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
              <Link
                href="/billing"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Manage in Billing <ArrowRight className="h-3 w-3" />
              </Link>
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

          <Tabs defaultValue="profile">
            <TabsList>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
            </TabsList>
            <TabsContent value="profile">
              <ProfileTab />
            </TabsContent>
            <TabsContent value="members">
              <MembersTab workspaceId={workspace.id} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
