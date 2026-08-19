'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Ban, CheckCircle2, Circle } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ActionItemStatus, Task } from '@ama/shared-types';
import { meetingsApi, useMyTasks } from '@/lib/api/meetings';
import { useCurrentUser } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatDate } from '@/lib/utils';

const STATUS_FILTERS: Array<{ label: string; value?: ActionItemStatus }> = [
  { label: 'All' },
  { label: 'Open', value: 'OPEN' },
  { label: 'Done', value: 'DONE' },
  { label: 'Dismissed', value: 'DISMISSED' },
];

type Scope = 'mine' | 'unassigned' | 'all';

const SCOPES: Array<{ label: string; value: Scope }> = [
  { label: 'Mine', value: 'mine' },
  { label: 'Unassigned', value: 'unassigned' },
  { label: 'Everyone', value: 'all' },
];

export default function TasksPage() {
  const [status, setStatus] = useState<ActionItemStatus | undefined>(undefined);
  const [scope, setScope] = useState<Scope>('mine');
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useMyTasks({ status, scope });
  const tasks = data?.items ?? [];

  // Claim an unassigned task for yourself (same endpoint the Action Items tab uses).
  const claim = useMutation({
    mutationFn: (task: Task) =>
      meetingsApi.updateActionItem(task.meetingId, task.id, { assigneeUserId: user?.id ?? null }),
    onSuccess: () => {
      toast.success('Task assigned to you');
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['meetings'] });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: () => toast.error("Couldn't claim the task."),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <p className="text-sm text-muted-foreground">Action items across all your meetings.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f.label}
              variant={status === f.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatus(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          {SCOPES.map((s) => (
            <Button
              key={s.value}
              variant={scope === s.value ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setScope(s.value)}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <TasksSkeleton />
      ) : isError ? (
        <p className="text-sm text-muted-foreground">Couldn&rsquo;t load tasks.</p>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage(scope)}</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <TaskCard
              key={`${task.meetingId}-${task.id}`}
              task={task}
              claimable={scope === 'unassigned' && Boolean(user)}
              claiming={claim.isPending && claim.variables?.id === task.id}
              onClaim={() => claim.mutate(task)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function emptyMessage(scope: Scope): string {
  if (scope === 'mine') {
    return 'Nothing assigned to you. Assign an action item to yourself from a meeting, or claim one from Unassigned.';
  }
  if (scope === 'unassigned') return 'No unassigned tasks — everything has an owner.';
  return 'No action items yet.';
}

function TaskCard({
  task,
  claimable,
  claiming,
  onClaim,
}: {
  task: Task;
  claimable: boolean;
  claiming: boolean;
  onClaim: () => void;
}) {
  const due = task.dueDate ? new Date(task.dueDate) : null;
  const overdue = Boolean(due && task.status === 'OPEN' && due < new Date());
  const Icon = task.status === 'DONE' ? CheckCircle2 : task.status === 'DISMISSED' ? Ban : Circle;

  return (
    <li className="rounded-lg border p-4 transition-colors hover:bg-accent">
      <Link
        href={`/meetings/${task.meetingId}?tab=action-items`}
        className="flex items-start gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Icon
          className={cn(
            'mt-0.5 h-4 w-4 shrink-0',
            task.status === 'DONE' && 'text-primary',
            task.status === 'DISMISSED' && 'text-muted-foreground',
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1 space-y-1">
          <p
            className={cn(
              'text-sm font-medium',
              task.status !== 'OPEN' && 'text-muted-foreground line-through',
            )}
          >
            {task.text}
          </p>
          <p className="text-xs text-muted-foreground">
            {task.meetingTitle}
            {task.assigneeText ? ` · mentioned: ${task.assigneeText}` : ''}
          </p>
          {due && (
            <p className={cn('text-xs', overdue ? 'text-destructive' : 'text-muted-foreground')}>
              Due {formatDate(task.dueDate as string)}
            </p>
          )}
        </div>
      </Link>
      {claimable && (
        <Button size="sm" variant="outline" className="mt-3" onClick={onClaim} disabled={claiming}>
          {claiming ? 'Assigning…' : 'Assign to me'}
        </Button>
      )}
    </li>
  );
}

function TasksSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
  );
}
