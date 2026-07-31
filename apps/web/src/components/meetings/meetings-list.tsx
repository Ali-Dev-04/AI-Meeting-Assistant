'use client';

import { Inbox } from 'lucide-react';
import type { MeetingStatus } from '@ama/shared-types';
import { useMeetings } from '@/lib/api/meetings';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MeetingCard } from './meeting-card';

export function MeetingsList({ status }: { status?: MeetingStatus }) {
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useMeetings({ status });

  if (isLoading) return <MeetingsListSkeleton />;
  if (isError) {
    return (
      <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Couldn&rsquo;t load meetings. Please try again.
      </p>
    );
  }

  const meetings = data?.pages.flatMap((page) => page.items) ?? [];

  if (meetings.length === 0) return <EmptyState status={status} />;

  return (
    <div className="space-y-3">
      {meetings.map((meeting) => (
        <MeetingCard key={meeting.id} meeting={meeting} />
      ))}
      {hasNextPage && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Loading…' : 'Load more'}
        </Button>
      )}
    </div>
  );
}

function EmptyState({ status }: { status?: MeetingStatus }) {
  const message = status
    ? `No ${status.toLowerCase()} meetings yet.`
    : 'No meetings yet. Upload your first recording to get a transcript, summary, and action items.';
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center">
      <Inbox className="h-8 w-8 text-muted-foreground" aria-hidden />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function MeetingsListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-[68px] w-full" />
      ))}
    </div>
  );
}
