'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Meeting } from '@ama/shared-types';
import { useDeleteMeeting } from '@/lib/api/meetings';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StatusBadge } from './status-badge';
import { formatDate, formatDuration } from '@/lib/utils';

/** Dashboard meeting card with a hover-revealed delete action (confirm dialog). */
export function MeetingCard({ meeting }: { meeting: Meeting }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const remove = useDeleteMeeting();

  function onDelete() {
    remove.mutate(meeting.id, {
      onSuccess: () => {
        toast.success('Meeting deleted');
        setConfirmOpen(false);
      },
      onError: () => toast.error("Couldn't delete the meeting."),
    });
  }

  return (
    <div className="group relative">
      <Link
        href={`/meetings/${meeting.id}`}
        className="block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {/* pr-14 reserves a hover zone for the delete button so it never overlaps the badge. */}
        <Card className="flex items-center justify-between gap-4 p-4 pr-14 transition-colors hover:bg-accent">
          <div className="min-w-0 space-y-1">
            <p className="truncate font-medium">{meeting.title}</p>
            <p className="text-sm text-muted-foreground">
              {formatDate(meeting.occurredAt)}
              {meeting.durationSeconds ? ` · ${formatDuration(meeting.durationSeconds)}` : ''}
            </p>
          </div>
          <StatusBadge status={meeting.status} />
        </Card>
      </Link>

      <button
        type="button"
        aria-label={`Delete ${meeting.title}`}
        onClick={() => setConfirmOpen(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border bg-background p-1.5 text-muted-foreground opacity-0 shadow-sm transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete meeting?</DialogTitle>
            <DialogDescription>
              &ldquo;{meeting.title}&rdquo; will be removed from your dashboard, search, tasks, and
              shares. This can&rsquo;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={remove.isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onDelete} disabled={remove.isPending}>
              {remove.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
