'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Ban, CheckCircle2, Circle } from 'lucide-react';
import type { ActionItemStatus, Task } from '@ama/shared-types';
import { useMyTasks } from '@/lib/api/meetings';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatDate } from '@/lib/utils';

const STATUS_FILTERS: Array<{ label: string; value?: ActionItemStatus }> = [
  { label: 'All' },
  { label: 'Open', value: 'OPEN' },
  { label: 'Done', value: 'DONE' },
  { label: 'Dismissed', value: 'DISMISSED' },
];

const SCOPES = [
  { label: 'Mine', value: 'mine' as const },
  { label: 'Everyone', value: 'all' as const },
];

export default function TasksPage() {
  const [status, setStatus] = useState<ActionItemStatus | undefined>(undefined);
  const [scope, setScope] = useState<'mine' | 'all'>('mine');

  const { data, isLoading, isError } = useMyTasks({ status, scope });
  const tasks = data?.items ?? [];

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
        <p className="text-sm text-muted-foreground">
          {scope === 'mine'
            ? 'Nothing assigned to you. Assign an action item to yourself from a meeting.'
            : 'No action items yet.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <TaskCard key={`${task.meetingId}-${task.id}`} task={task} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const due = task.dueDate ? new Date(task.dueDate) : null;
  const overdue = Boolean(due && task.status === 'OPEN' && due < new Date());
  const Icon = task.status === 'DONE' ? CheckCircle2 : task.status === 'DISMISSED' ? Ban : Circle;

  return (
    <li>
      <Link
        href={`/meetings/${task.meetingId}?tab=action-items`}
        className="block rounded-lg border p-4 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex items-start gap-3">
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
            <p className="text-xs text-muted-foreground">{task.meetingTitle}</p>
            {due && (
              <p className={cn('text-xs', overdue ? 'text-destructive' : 'text-muted-foreground')}>
                Due {formatDate(task.dueDate as string)}
              </p>
            )}
          </div>
        </div>
      </Link>
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
