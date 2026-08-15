'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, Download, Share2 } from 'lucide-react';
import { useMeeting } from '@/lib/api/meetings';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/meetings/status-badge';
import { MeetingTabs } from '@/components/meetings/detail/meeting-tabs';
import { ShareDialog } from '@/components/meetings/detail/share-dialog';
import { ExportDialog } from '@/components/meetings/detail/export-dialog';
import { formatDate, formatDuration } from '@/lib/utils';

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: meeting, isLoading, isError } = useMeeting(id);

  // Controlled tab + pending seek target so a chat citation can jump to the transcript.
  // Initial tab may come from a deep link (e.g. /tasks -> ?tab=action-items).
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') ?? 'summary');
  const [seekIndex, setSeekIndex] = useState<number | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="mt-6 h-48 w-full" />
      </div>
    );
  }

  if (isError || !meeting) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Link>
        </Button>
        <p className="text-muted-foreground">Meeting not found or you don&rsquo;t have access.</p>
      </div>
    );
  }

  const ready = meeting.status === 'READY';
  const processing = meeting.status !== 'READY' && meeting.status !== 'FAILED';

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/dashboard">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to meetings
        </Link>
      </Button>

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{meeting.title}</h1>
          <p className="text-sm text-muted-foreground">
            {formatDate(meeting.occurredAt)}
            {meeting.durationSeconds ? ` · ${formatDuration(meeting.durationSeconds)}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {ready && (
            <>
              <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
                <Download className="mr-1 h-4 w-4" /> Export
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
                <Share2 className="mr-1 h-4 w-4" /> Share
              </Button>
            </>
          )}
          <StatusBadge status={meeting.status} />
        </div>
      </div>

      {ready ? (
        <MeetingTabs
          meetingId={meeting.id}
          value={tab}
          onValueChange={setTab}
          seekIndex={seekIndex}
          onSeekConsumed={() => setSeekIndex(null)}
          onCitationClick={(segmentIndex) => {
            setSeekIndex(segmentIndex);
            setTab('transcript');
          }}
        />
      ) : (
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          {processing
            ? `This meeting is still processing (${meeting.status.toLowerCase()}). The summary, transcript, action items, and decisions will appear here once it's ready.`
            : 'Processing failed. You can try re-processing from the actions menu.'}
        </div>
      )}

      {ready && (
        <>
          <ShareDialog meetingId={meeting.id} open={shareOpen} onOpenChange={setShareOpen} />
          <ExportDialog meetingId={meeting.id} open={exportOpen} onOpenChange={setExportOpen} />
        </>
      )}
    </div>
  );
}
