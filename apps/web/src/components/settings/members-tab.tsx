'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Copy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  inviteSchema,
  type Invitation,
  type InviteValues,
  type Member,
  type MemberRole,
} from '@ama/shared-types';
import {
  useInvite,
  useInvitations,
  useMembers,
  useRemoveMember,
  useRevokeInvitation,
  useUpdateMemberRole,
} from '@/lib/api/workspaces';
import { useCurrentUser } from '@/lib/api/auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';

const ROLE_OPTIONS: MemberRole[] = ['MEMBER', 'ADMIN'];

const selectClass =
  'h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function MembersTab({ workspaceId }: { workspaceId: string }) {
  const { data: user } = useCurrentUser();
  const { data: members, isLoading } = useMembers(workspaceId);
  const { data: invitations } = useInvitations(workspaceId);
  const invite = useInvite(workspaceId);
  const [role, setRole] = useState<MemberRole>('MEMBER');

  const myRole = members?.find((m) => m.userId === user?.id)?.role ?? null;
  const isOwner = myRole === 'OWNER';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteValues>({ resolver: zodResolver(inviteSchema), defaultValues: { role: 'MEMBER' } });

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Invite link copied');
    } catch {
      toast.error('Copy failed — select the link manually.');
    }
  }

  async function onSubmit(values: InviteValues) {
    try {
      const invitation = await invite.mutateAsync({ email: values.email, role });
      toast.success(`Invitation created for ${values.email}`, {
        description: 'Share the link — they join when they register with that email.',
      });
      if (invitation.inviteUrl) await copyLink(invitation.inviteUrl);
      reset();
    } catch (error) {
      toast.error('Could not create invite', {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-wrap items-end gap-3">
        <div className="min-w-52 flex-1 space-y-2">
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
            className={selectClass}
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0) + r.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={invite.isPending}>
          {invite.isPending ? 'Creating…' : 'Create invite'}
        </Button>
      </form>

      {invitations && invitations.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Pending invitations
          </h2>
          {invitations.map((invitation) => (
            <InvitationRow key={invitation.id} invitation={invitation} workspaceId={workspaceId} onCopy={copyLink} />
          ))}
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Members
        </h2>
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          members?.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              workspaceId={workspaceId}
              isSelf={member.userId === user?.id}
              canManage={myRole === 'OWNER' || myRole === 'ADMIN'}
              isOwner={isOwner}
            />
          ))
        )}
      </div>
    </div>
  );
}

function InvitationRow({
  invitation,
  workspaceId,
  onCopy,
}: {
  invitation: Invitation;
  workspaceId: string;
  onCopy: (url: string) => Promise<void>;
}) {
  const revoke = useRevokeInvitation(workspaceId);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{invitation.email}</p>
        <p className="text-xs text-muted-foreground">
          {invitation.role.toLowerCase()} · expires {formatDate(invitation.expiresAt)}
        </p>
      </div>
      <div className="flex items-center gap-1">
        {invitation.inviteUrl && (
          <Button variant="ghost" size="icon" aria-label="Copy invite link" onClick={() => void onCopy(invitation.inviteUrl ?? '')}>
            <Copy className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive"
          aria-label="Revoke invitation"
          disabled={revoke.isPending}
          onClick={() =>
            revoke.mutate(invitation.id, {
              onSuccess: () => toast.success('Invitation revoked'),
              onError: () => toast.error("Couldn't revoke the invitation."),
            })
          }
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function MemberRow({
  member,
  workspaceId,
  isSelf,
  canManage,
  isOwner,
}: {
  member: Member;
  workspaceId: string;
  isSelf: boolean;
  canManage: boolean;
  isOwner: boolean;
}) {
  const updateRole = useUpdateMemberRole(workspaceId);
  const remove = useRemoveMember(workspaceId);

  // Owner rows are protected; you can never act on yourself here.
  const protectOwnerRow = member.role === 'OWNER';
  const canChangeRole = isOwner && !protectOwnerRow && !isSelf;
  const canRemove =
    canManage && !protectOwnerRow && !isSelf && (isOwner || member.role !== 'ADMIN');

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {member.user.name ?? member.user.email}
          {isSelf && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
        </p>
        <p className="truncate text-xs text-muted-foreground">{member.user.email}</p>
      </div>

      <div className="flex items-center gap-2">
        {canChangeRole ? (
          <select
            aria-label={`Role for ${member.user.email}`}
            value={member.role}
            disabled={updateRole.isPending}
            onChange={(e) =>
              updateRole.mutate(
                { memberId: member.id, role: e.target.value as 'ADMIN' | 'MEMBER' },
                {
                  onSuccess: () => toast.success('Role updated'),
                  onError: () => toast.error("Couldn't update the role."),
                },
              )
            }
            className={selectClass}
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0) + r.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        ) : (
          <Badge variant={member.role === 'OWNER' ? 'default' : 'secondary'} className="capitalize">
            {member.role.toLowerCase()}
          </Badge>
        )}
        {canRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            aria-label={`Remove ${member.user.email}`}
            disabled={remove.isPending}
            onClick={() =>
              remove.mutate(member.id, {
                onSuccess: () => toast.success('Member removed'),
                onError: () => toast.error("Couldn't remove the member."),
              })
            }
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
