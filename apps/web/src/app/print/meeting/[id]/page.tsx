'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Printer } from 'lucide-react';
import {
  useMeeting,
  useMeetingActionItems,
  useMeetingDecisions,
  useMeetingSummary,
  useMeetingTranscript,
} from '@/lib/api/meetings';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, formatDuration } from '@/lib/utils';

function ts(ms: number): string {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Print-friendly meeting document (outside the app shell so no sidebar/nav prints).
 * Auto-opens the browser print dialog once loaded — "Save as PDF" from there.
 */
export default function PrintMeetingPage() {
  const { id } = useParams<{ id: string }>();
  const { data: meeting, isLoading } = useMeeting(id);
  const { data: summary } = useMeetingSummary(id);
  const { data: transcript } = useMeetingTranscript(id);
  const { data: items } = useMeetingActionItems(id);
  const { data: decisions } = useMeetingDecisions(id);
  const printed = useRef(false);

  useEffect(() => {
    if (!isLoading && meeting && !printed.current) {
      printed.current = true;
      const timer = setTimeout(() => window.print(), 400);
      return () => clearTimeout(timer);
    }
  }, [isLoading, meeting]);

  if (isLoading || !meeting) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 p-8">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="mt-6 h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/meetings/${meeting.id}`}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Link>
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="mr-1 h-4 w-4" /> Print
          </Button>
        </div>

        <h1 className="text-2xl font-semibold">{meeting.title}</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {formatDate(meeting.occurredAt)}
          {meeting.durationSeconds ? ` · ${formatDuration(meeting.durationSeconds)}` : ''}
        </p>

        {summary && (
          <section className="mt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Overview</h2>
            <p className="mt-1 text-sm leading-relaxed">{summary.overview}</p>
            {summary.keyPoints.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
                {summary.keyPoints.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            )}
          </section>
        )}

        {items && items.length > 0 && (
          <section className="mt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Action items</h2>
            <ul className="mt-1 space-y-1 text-sm">
              {items.map((item) => (
                <li key={item.id}>
                  {item.status === 'DONE' ? '☑' : '☐'} {item.text}
                  {item.assigneeText ? ` — ${item.assigneeText}` : ''}
                </li>
              ))}
            </ul>
          </section>
        )}

        {decisions && decisions.length > 0 && (
          <section className="mt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Decisions</h2>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
              {decisions.map((d) => (
                <li key={d.id}>{d.text}</li>
              ))}
            </ul>
          </section>
        )}

        {transcript && transcript.segments.length > 0 && (
          <section className="mt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Transcript</h2>
            <div className="mt-2 space-y-2 text-sm leading-relaxed">
              {transcript.segments.map((s) => (
                <p key={s.id}>
                  <span className="font-medium">[{ts(s.startTimeMs)}] {s.speakerLabel}:</span> {s.text}
                </p>
              ))}
            </div>
          </section>
        )}

        <p className="mt-8 border-t pt-3 text-center text-xs text-neutral-400">
          Exported from AI Meeting Assistant
        </p>
      </div>
    </div>
  );
}
