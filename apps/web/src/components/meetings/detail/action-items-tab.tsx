'use client';

import { Calendar, Check, User } from 'lucide-react';
import type { ActionItem, ActionItemStatus, Member } from '@ama/shared-types';
import { useMeetingActionItems, useUpdateActionItem } from '@/lib/api/meetings';
import { useCurrentWorkspace, useMembers } from '@/lib/api/workspaces';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatDate } from '@/lib/utils';

const STATUSES: ActionItemStatus[] = ['OPEN', 'DONE', 'DISMISSED'];

export function ActionItemsTab({ meetingId }: { meetingId: string }) {
  const { data: items, isLoading, isError } = useMeetingActionItems(meetingId);
  const workspace = useCurrentWorkspace();
  const { data: members } = useMembers(workspace?.id ?? '');

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (isError) {
    return <p className="text-sm text-muted-foreground">Couldn&rsquo;t load action items.</p>;
  }
  if (!items || items.length === 0) {
    return <p className="text-sm text-muted-foreground">No action items were detected.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <ActionItemRow key={item.id} item={item} meetingId={meetingId} members={members ?? []} />
      ))}
    </ul>
  );
}

function ActionItemRow({
  item,
  meetingId,
  members,
}: {
  item: ActionItem;
  meetingId: string;
  members: Member[];
}) {
  const update = useUpdateActionItem(meetingId);
  const done = item.status === 'DONE';
  const due = item.dueDate ? new Date(item.dueDate) : null;
  const overdue = Boolean(due && item.status === 'OPEN' && due < new Date());
  const assignee = members.find((m) => m.userId === item.assigneeUserId);

  const selectClass =
    'h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <li className="space-y-2 rounded-lg border p-3">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => update.mutate({ itemId: item.id, status: done ? 'OPEN' : 'DONE' })}
          aria-pressed={done}
          aria-label={done ? 'Mark as not done' : 'Mark as done'}
          className={cn(
            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            done ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
          )}
        >
          {done && <Check className="h-3 w-3" />}
        </button>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className={cn('text-sm leading-relaxed', done && 'text-muted-foreground line-through')}>
            {item.text}
          </p>
          {item.assigneeText && !assignee && (
            <p className="text-xs text-muted-foreground">{item.assigneeText}</p>
          )}
          {due && (
            <p
              className={cn(
                'flex items-center gap-1 text-xs',
                overdue ? 'text-destructive' : 'text-muted-foreground',
              )}
            >
              <Calendar className="h-3 w-3" /> Due {formatDate(item.dueDate as string)}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pl-8">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <User className="h-3 w-3" aria-hidden />
          <select
            value={item.assigneeUserId ?? ''}
            onChange={(e) =>
              update.mutate({ itemId: item.id, assigneeUserId: e.target.value || null })
            }
            className={selectClass}
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.user.name ?? m.user.email}
              </option>
            ))}
          </select>
        </label>

        <input
          type="date"
          value={item.dueDate ? item.dueDate.slice(0, 10) : ''}
          onChange={(e) =>
            update.mutate({
              itemId: item.id,
              dueDate: e.target.value ? new Date(e.target.value).toISOString() : null,
            })
          }
          className={selectClass}
          aria-label="Due date"
        />

        <select
          value={item.status}
          onChange={(e) =>
            update.mutate({ itemId: item.id, status: e.target.value as ActionItemStatus })
          }
          className={cn(selectClass, 'capitalize')}
          aria-label="Status"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.toLowerCase()}
            </option>
          ))}
        </select>
      </div>
    </li>
  );
}
