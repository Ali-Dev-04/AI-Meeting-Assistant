'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import type { SharedMeetingView } from '@ama/shared-types';
import { fetchSharedView } from '@/lib/api/meetings';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, formatDuration } from '@/lib/utils';

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Public, read-only view of a shared meeting. Lives OUTSIDE the (app)/(auth)
 * route groups so it gets no sidebar/auth shell — only the root layout. Uses a
 * raw fetch (fetchSharedView) with no bearer token; the API resolves it by token.
 */
export default function SharedMeetingPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SharedMeetingView | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'not-found'>('loading');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetchSharedView(token)
      .then((view) => {
        if (!cancelled) {
          setData(view);
          setState('ready');
        }
      })
      .catch(() => {
        if (!cancelled) setState('not-found');
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state === 'loading') return <CenteredSkeleton />;
  if (state === 'not-found' || !data) {
    return (
      <Centered>
        <h1 className="text-xl font-semibold">Link unavailable</h1>
        <p className="text-sm text-muted-foreground">
          This share link is invalid, expired, or has been revoked.
        </p>
      </Centered>
    );
  }

  const { meeting, summary, transcript } = data;

  return (
    <div className="mx-auto min-h-screen max-w-3xl space-y-8 px-4 py-10">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Shared meeting</p>
        <h1 className="text-2xl font-semibold tracking-tight">{meeting.title}</h1>
        <p className="text-sm text-muted-foreground">
          {formatDate(meeting.occurredAt)}
          {meeting.durationSeconds ? ` · ${formatDuration(meeting.durationSeconds)}` : ''}
        </p>
      </header>

      {summary && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Overview
          </h2>
          <p className="text-sm leading-relaxed">{summary.overview}</p>
          {summary.keyPoints.length > 0 && (
            <ul className="space-y-2 pt-2">
              {summary.keyPoints.map((p, i) => (
                <li key={i} className="flex gap-2 text-sm leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {transcript && transcript.segments.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Transcript
          </h2>
          <div className="space-y-1">
            {transcript.segments.map((s) => (
              <div key={s.id} className="flex gap-3 rounded-md p-2 hover:bg-accent/50">
                <span className="w-12 shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground">
                  {formatTimestamp(s.startTimeMs)}
                </span>
                <div className="min-w-0 space-y-0.5">
                  <span className="text-xs font-medium text-muted-foreground">{s.speakerLabel}</span>
                  <p className="text-sm leading-relaxed">{s.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="border-t pt-4 text-center text-xs text-muted-foreground">
        Shared via AI Meeting Assistant
      </footer>
    </div>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 px-4 text-center">
      {children}
    </div>
  );
}

function CenteredSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="mt-6 h-32 w-full" />
    </div>
  );
}
