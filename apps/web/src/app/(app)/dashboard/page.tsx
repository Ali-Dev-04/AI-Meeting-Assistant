'use client';

import { useState } from 'react';
import { CalendarCheck, CircleCheckBig, ListTodo, Loader2, TriangleAlert, Upload } from 'lucide-react';
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
    {
      label: 'Meetings',
      value: stats.meetings.total,
      hint: `${stats.meetings.ready} ready`,
      icon: CalendarCheck,
      tone: 'text-primary',
    },
    {
      label: 'Processing',
      value: stats.meetings.processing,
      hint: stats.meetings.processing > 0 ? 'in the pipeline' : 'all done',
      icon: Loader2,
      tone: 'text-sky-500',
      spin: stats.meetings.processing > 0,
    },
    {
      label: 'Open tasks',
      value: stats.actionItems.open,
      hint: `${stats.actionItems.done} done`,
      icon: ListTodo,
      tone: 'text-violet-500',
    },
    {
      label: 'Overdue',
      value: stats.actionItems.overdue,
      hint: `${stats.actionItems.completionRate}% completion`,
      icon: stats.actionItems.overdue > 0 ? TriangleAlert : CircleCheckBig,
      tone: stats.actionItems.overdue > 0 ? 'text-destructive' : 'text-emerald-500',
      danger: stats.actionItems.overdue > 0,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="flex items-center gap-4 p-4">
          <card.icon
            className={`${card.spin ? 'animate-spin' : ''} h-8 w-8 shrink-0 ${card.tone}`}
            aria-hidden
          />
          <div className="min-w-0 space-y-0.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {card.label}
            </p>
            <p
              className={
                card.danger ? 'text-2xl font-semibold text-destructive' : 'text-2xl font-semibold'
              }
            >
              {card.value}
            </p>
            <p className="truncate text-xs text-muted-foreground">{card.hint}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
