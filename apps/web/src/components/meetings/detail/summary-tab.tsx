'use client';

import { useState } from 'react';
import { Pencil, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Summary } from '@ama/shared-types';
import { useMeetingSummary, useUpdateSummary } from '@/lib/api/meetings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

export function SummaryTab({ meetingId }: { meetingId: string }) {
  const { data: summary, isLoading, isError } = useMeetingSummary(meetingId);

  if (isLoading) return <SummarySkeleton />;
  if (isError || !summary) {
    return <p className="text-sm text-muted-foreground">Summary isn&rsquo;t available yet.</p>;
  }

  return <SummaryEditor meetingId={meetingId} summary={summary} />;
}

function samePoints(a: string[], b: string[]) {
  return a.length === b.length && a.every((p, i) => p === b[i]);
}

/**
 * Editable editor. Local state is the source of truth while editing; a Save bar
 * appears when dirty. Mounted only once the summary has loaded, so the useState
 * initializers always see real data (and aren't reset by background refetches).
 */
function SummaryEditor({ meetingId, summary }: { meetingId: string; summary: Summary }) {
  const update = useUpdateSummary(meetingId);
  const [overview, setOverview] = useState(summary.overview);
  const [points, setPoints] = useState<string[]>(summary.keyPoints);

  const dirty = overview !== summary.overview || !samePoints(points, summary.keyPoints);

  function save() {
    const cleanPoints = points.map((p) => p.trim()).filter(Boolean);
    update.mutate(
      { overview: overview.trim(), keyPoints: cleanPoints },
      {
        onSuccess: () => toast.success('Summary updated'),
        onError: () => toast.error("Couldn't save the summary."),
      },
    );
  }

  function reset() {
    setOverview(summary.overview);
    setPoints(summary.keyPoints);
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Overview
          </h2>
          <Pencil className="h-3 w-3 text-muted-foreground" aria-hidden />
        </div>
        <Textarea
          value={overview}
          onChange={(e) => setOverview(e.target.value)}
          rows={4}
          className="leading-relaxed"
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Key points
        </h2>
        <ul className="space-y-2">
          {points.map((point, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
              <Input
                value={point}
                onChange={(e) =>
                  setPoints(points.map((p, j) => (j === i ? e.target.value : p)))
                }
                className="h-9"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground"
                aria-label="Remove key point"
                onClick={() => setPoints(points.filter((_, j) => j !== i))}
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
        <Button
          variant="outline"
          size="sm"
          disabled={points.length >= 20}
          onClick={() => setPoints([...points, ''])}
        >
          <Plus className="mr-1 h-4 w-4" /> Add key point
        </Button>
      </section>

      {dirty && (
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={save} disabled={update.isPending}>
            {update.isPending ? 'Saving…' : 'Save changes'}
          </Button>
          <Button size="sm" variant="ghost" onClick={reset} disabled={update.isPending}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="mt-4 h-4 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}
