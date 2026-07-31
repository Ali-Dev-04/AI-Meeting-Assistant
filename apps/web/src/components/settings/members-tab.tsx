'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { inviteSchema, type InviteValues, type Member, type MemberRole } from '@ama/shared-types';
import { useInvite, useMembers } from '@/lib/api/workspaces';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

const ROLE_OPTIONS: MemberRole[] = ['MEMBER', 'ADMIN'];

export function MembersTab({ workspaceId }: { workspaceId: string }) {
  const { data: members, isLoading } = useMembers(workspaceId);
  const invite = useInvite(workspaceId);
  const [role, setRole] = useState<MemberRole>('MEMBER');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteValues>({ resolver: zodResolver(inviteSchema), defaultValues: { role: 'MEMBER' } });

  async function onSubmit(values: InviteValues) {
    try {
      await invite.mutateAsync({ email: values.email, role });
      toast.success(`Invitation sent to ${values.email}`);
      reset();
    } catch (error) {
      toast.error('Could not send invite', {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-wrap items-end gap-3">
        <div className="flex-1 space-y-2">
          <Label htmlFor="invite-email">Invite by email</Label>
          <Input id="invite-email" type="email" placeholder="teammate@company.com" {...register('email')} />
          {errors.email && (
            <p className="text-sm text-destructive" role="alert">
              {errors.email.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="invite-role">Role</Label>
          <select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value as MemberRole)}
            className="flex h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0) + r.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={invite.isPending}>
          {invite.isPending ? 'Sending…' : 'Send invite'}
        </Button>
      </form>

      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Members
        </h2>
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          members?.map((member) => <MemberRow key={member.id} member={member} />)
        )}
      </div>
    </div>
  );
}

function MemberRow({ member }: { member: Member }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {member.user.name ?? member.user.email}
        </p>
        <p className="truncate text-xs text-muted-foreground">{member.user.email}</p>
      </div>
      <Badge variant={member.role === 'OWNER' ? 'default' : 'secondary'} className="capitalize">
        {member.role.toLowerCase()}
      </Badge>
    </div>
  );
}
