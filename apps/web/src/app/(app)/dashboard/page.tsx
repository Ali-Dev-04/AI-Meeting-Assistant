'use client';

import { useState } from 'react';
import { Upload } from 'lucide-react';
import type { MeetingStatus } from '@ama/shared-types';
import { Button } from '@/components/ui/button';
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
