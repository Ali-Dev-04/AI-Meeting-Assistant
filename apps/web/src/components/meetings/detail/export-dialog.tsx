'use client';

import { useRouter } from 'next/navigation';
import { FileText, Printer, Subtitles } from 'lucide-react';
import { toast } from 'sonner';
import { downloadMeetingExport } from '@/lib/api/meetings';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/** Export options for one meeting: Markdown doc, .srt subtitles, or browser print-to-PDF. */
export function ExportDialog({
  meetingId,
  open,
  onOpenChange,
}: {
  meetingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();

  async function download(kind: 'markdown' | 'srt') {
    try {
      await downloadMeetingExport(meetingId, kind);
      toast.success('Download started');
      onOpenChange(false);
    } catch {
      toast.error("Couldn't export the meeting.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export meeting</DialogTitle>
          <DialogDescription>Download a document, subtitles, or print to PDF.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => void download('markdown')}
          >
            <FileText className="mr-2 h-4 w-4" />
            Markdown (.md) — summary, action items, transcript
          </Button>
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => void download('srt')}
          >
            <Subtitles className="mr-2 h-4 w-4" />
            Subtitles (.srt) — timestamped transcript
          </Button>
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => {
              onOpenChange(false);
              router.push(`/print/meeting/${meetingId}`);
            }}
          >
            <Printer className="mr-2 h-4 w-4" />
            Print / Save as PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
