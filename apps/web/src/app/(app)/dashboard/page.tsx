'use client';

import { useState } from 'react';
import { Upload } from 'lucide-react';
import type { DashboardStats, MeetingStatus } from '@ama/shared-types';
import { useDashboardStats } from '@/lib/api/stats';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MeetingsList } from '@/components/meetings/meetings-list';
import { UploadDialog } from '@/components/meetings/upload-dialog';

const FILTERS: Array<{ label: string; value?: MeetingStatus }> = [
  { label: 'All' },
  { label: 'Queued', value: 'QUEUED' },
  { label: 'Ready', value: 'READY' },
];

export default function DashboardPage() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [filter, setFilter] = useState<MeetingStatus | undefined>(undefined);
  const { data: stats, isLoading } = useDashboardStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Meetings</h1>
          <p className="text-sm text-muted-foreground">All your processed meetings.</p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Upload meeting
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        stats && <StatsCards stats={stats} />
      )}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.label}
            variant={filter === f.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <MeetingsList status={filter} />
      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
}

function StatsCards({ stats }: { stats: DashboardStats }) {
  const cards = [
    { label: 'Meetings', value: stats.meetings.total, hint: `${stats.meetings.ready} ready` },
    {
      label: 'Processing',
      value: stats.meetings.processing,
      hint: stats.meetings.processing > 0 ? 'in the pipeline' : 'all done',
    },
    { label: 'Open tasks', value: stats.actionItems.open, hint: `${stats.actionItems.done} done` },
    {
      label: 'Overdue',
      value: stats.actionItems.overdue,
      hint: `${stats.actionItems.completionRate}% completion`,
      danger: stats.actionItems.overdue > 0,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="space-y-1 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {card.label}
          </p>
          <p
            className={
              card.danger ? 'text-3xl font-semibold text-destructive' : 'text-3xl font-semibold'
            }
          >
            {card.value}
          </p>
          <p className="text-xs text-muted-foreground">{card.hint}</p>
        </Card>
      ))}
    </div>
  );
}
