import { AlertCircle, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { MeetingStatus } from '@ama/shared-types';

type Variant = 'default' | 'secondary' | 'destructive' | 'success';

const CONFIG: Record<MeetingStatus, { label: string; variant: Variant; spinning: boolean }> = {
  QUEUED: { label: 'Queued', variant: 'secondary', spinning: false },
  TRANSCRIBING: { label: 'Transcribing', variant: 'secondary', spinning: true },
  SUMMARIZING: { label: 'Summarizing', variant: 'secondary', spinning: true },
  INDEXING: { label: 'Indexing', variant: 'secondary', spinning: true },
  READY: { label: 'Ready', variant: 'success', spinning: false },
  FAILED: { label: 'Failed', variant: 'destructive', spinning: false },
};

const ICONS: Record<MeetingStatus, typeof Clock> = {
  QUEUED: Clock,
  TRANSCRIBING: Loader2,
  SUMMARIZING: Loader2,
  INDEXING: Loader2,
  READY: CheckCircle2,
  FAILED: AlertCircle,
};

export function StatusBadge({ status }: { status: MeetingStatus }) {
  const config = CONFIG[status];
  const Icon = ICONS[status];
  return (
    <Badge variant={config.variant}>
      <Icon className={config.spinning ? 'mr-1 h-3 w-3 animate-spin' : 'mr-1 h-3 w-3'} aria-hidden />
      {config.label}
      <span className="sr-only">Status: {config.label}</span>
    </Badge>
  );
}
