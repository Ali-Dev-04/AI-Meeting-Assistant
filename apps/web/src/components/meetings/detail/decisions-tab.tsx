'use client';

import { useMeetingDecisions } from '@/lib/api/meetings';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export function DecisionsTab({ meetingId }: { meetingId: string }) {
  const { data: decisions, isLoading, isError } = useMeetingDecisions(meetingId);

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (isError) {
    return <p className="text-sm text-muted-foreground">Couldn&rsquo;t load decisions.</p>;
  }
  if (!decisions || decisions.length === 0) {
    return <p className="text-sm text-muted-foreground">No decisions were detected.</p>;
  }

  return (
    <ul className="space-y-3">
      {decisions.map((decision) => (
        <li key={decision.id} className="rounded-lg border p-3">
          <div className="mb-1.5">
            <Badge variant="secondary">Decision</Badge>
          </div>
          <p className="text-sm leading-relaxed">{decision.text}</p>
          {decision.context && (
            <p className="mt-1 text-xs text-muted-foreground">{decision.context}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
