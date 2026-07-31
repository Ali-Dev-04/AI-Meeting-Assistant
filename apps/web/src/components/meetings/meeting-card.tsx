import Link from 'next/link';
import type { Meeting } from '@ama/shared-types';
import { Card } from '@/components/ui/card';
import { StatusBadge } from './status-badge';
import { formatDate, formatDuration } from '@/lib/utils';

export function MeetingCard({ meeting }: { meeting: Meeting }) {
  return (
    <Link href={`/meetings/${meeting.id}`} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg">
      <Card className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-accent">
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
  );
}
