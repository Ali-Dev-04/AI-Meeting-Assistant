'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useChangePassword, useCurrentUser, useUpdateProfile } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

/** Settings → Profile: account info, display-name editing, password change. */
export function ProfileTab() {
  const { data: user, isLoading } = useCurrentUser();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();

  const [name, setName] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!user) return <p className="text-sm text-muted-foreground">Couldn&rsquo;t load your profile.</p>;

  const displayName = name ?? user.name ?? '';
  const nameDirty = displayName !== (user.name ?? '');

  return (
    <div className="space-y-6">
      <Card className="space-y-1 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Account</p>
        <p className="text-lg font-semibold">{user.name ?? user.email}</p>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </Card>

      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          updateProfile.mutate(
            { name: displayName.trim() },
            {
              onSuccess: () => toast.success('Profile updated'),
              onError: () => toast.error("Couldn't update your profile."),
            },
          );
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="profile-name">Display name</Label>
          <Input
            id="profile-name"
            value={displayName}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={100}
          />
        </div>
        <Button type="submit" size="sm" disabled={updateProfile.isPending || !nameDirty || !displayName.trim()}>
          {updateProfile.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </form>

      <form
        className="space-y-3 border-t pt-6"
        onSubmit={(e) => {
          e.preventDefault();
          changePassword.mutate(
            { currentPassword, newPassword },
            {
              onSuccess: () => {
                toast.success('Password changed');
                setCurrentPassword('');
                setNewPassword('');
              },
              onError: (error) =>
                toast.error(error instanceof Error ? error.message : "Couldn't change the password."),
            },
          );
        }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Change password
        </h2>
        <div className="space-y-2">
          <Label htmlFor="current-password">Current password</Label>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={changePassword.isPending || newPassword.length < 8 || !currentPassword}
        >
          {changePassword.isPending ? 'Changing…' : 'Change password'}
        </Button>
      </form>
    </div>
  );
}
