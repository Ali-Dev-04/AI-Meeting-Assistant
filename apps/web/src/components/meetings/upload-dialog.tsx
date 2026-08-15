'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Link2, UploadCloud } from 'lucide-react';
import {
  ALLOWED_UPLOAD_MIME,
  MAX_UPLOAD_BYTES,
  createMeetingSchema,
  type CreateMeetingValues,
} from '@ama/shared-types';
import { meetingsApi, useCompleteUpload, useCreateMeeting } from '@/lib/api/meetings';
import { uploadFileToStorage } from '@/lib/api/upload';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Stage = 'idle' | 'uploading' | 'completing';

export function UploadDialog({ open, onOpenChange }: UploadDialogProps) {
  const createMeeting = useCreateMeeting();
  const completeUpload = useCompleteUpload();

  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [progress, setProgress] = useState(0);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [mode, setMode] = useState<'file' | 'url'>('file');
  const [url, setUrl] = useState('');
  const [urlTitle, setUrlTitle] = useState('');
  const [importing, setImporting] = useState(false);

  async function submitImport() {
    setImporting(true);
    try {
      await meetingsApi.importFromUrl({
        url: url.trim(),
        ...(urlTitle.trim() ? { title: urlTitle.trim() } : {}),
      });
      toast.success('Import started', {
        description: "Processing has begun — you'll be notified when it's ready.",
      });
      onOpenChange(false);
      setUrl('');
      setUrlTitle('');
      setMode('file');
    } catch (error) {
      toast.error('Import failed', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setImporting(false);
    }
  }

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<CreateMeetingValues>({ resolver: zodResolver(createMeetingSchema) });

  function selectFile(incoming: File | null) {
    setFileError(null);
    if (!incoming) return;
    if (!(ALLOWED_UPLOAD_MIME as readonly string[]).includes(incoming.type)) {
      setFileError('Unsupported file type. Use mp3, wav, or mp4.');
      return;
    }
    if (incoming.size > MAX_UPLOAD_BYTES) {
      setFileError('File is too large (max 2 GB).');
      return;
    }
    setFile(incoming);
    // Pre-fill the title from the filename if the user hasn't typed one.
    if (!getValues('title')) {
      setValue('title', incoming.name.replace(/\.[^.]+$/, ''));
    }
  }

  function reset() {
    setFile(null);
    setStage('idle');
    setProgress(0);
    setFileError(null);
    setDragOver(false);
  }

  async function onSubmit(values: CreateMeetingValues) {
    if (!file) {
      setFileError('Please choose a file to upload.');
      return;
    }
    try {
      // 1) Create meeting + get presigned URL.
      const created = await createMeeting.mutateAsync({
        title: values.title,
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });
      // 2) Upload directly to storage with progress.
      setStage('uploading');
      setProgress(0);
      await uploadFileToStorage(created.uploadUrl, file, created.headers, (p) =>
        setProgress(p.percent),
      );
      // 3) Tell the API the upload is done → it enqueues processing.
      setStage('completing');
      await completeUpload.mutateAsync(created.id);

      toast.success('Upload complete', {
        description: "Processing has started — you'll be notified when it's ready.",
      });
      onOpenChange(false);
      reset();
    } catch (error) {
      toast.error('Upload failed', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
      setStage('idle');
      setProgress(0);
    }
  }

  const busy = stage !== 'idle';

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add meeting</DialogTitle>
          <DialogDescription>
            Upload a file, or import a recording from a URL (Zoom/Meet share link, direct file).
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === 'file' ? 'default' : 'outline'}
            onClick={() => setMode('file')}
          >
            <UploadCloud className="mr-1 h-3.5 w-3.5" /> Upload file
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === 'url' ? 'default' : 'outline'}
            onClick={() => setMode('url')}
          >
            <Link2 className="mr-1 h-3.5 w-3.5" /> Import from URL
          </Button>
        </div>

        {mode === 'file' && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <label
            htmlFor="meeting-file"
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              selectFile(e.dataTransfer.files?.[0] ?? null);
            }}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors hover:bg-accent',
              dragOver && 'border-primary bg-accent',
            )}
          >
            <UploadCloud className="h-8 w-8 text-muted-foreground" aria-hidden />
            <span className="text-sm font-medium">
              {file ? file.name : 'Drop file here or click to browse'}
            </span>
            <input
              id="meeting-file"
              type="file"
              accept={ALLOWED_UPLOAD_MIME.join(',')}
              className="sr-only"
              onChange={(e) => selectFile(e.target.files?.[0] ?? null)}
            />
          </label>

          {fileError && (
            <p className="text-sm text-destructive" role="alert">
              {fileError}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" placeholder="e.g. Q3 Planning Sync" {...register('title')} />
            {errors.title && (
              <p className="text-sm text-destructive" role="alert">
                {errors.title.message}
              </p>
            )}
          </div>

          {stage === 'uploading' && (
            <div className="space-y-1">
              <Progress value={progress} />
              <p className="text-right text-xs text-muted-foreground">{progress}%</p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !file}>
              {stage === 'uploading'
                ? `Uploading ${progress}%`
                : stage === 'completing'
                  ? 'Starting…'
                  : 'Process meeting'}
            </Button>
          </DialogFooter>
        </form>
        )}

        {mode === 'url' && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submitImport();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="import-url">Recording URL</Label>
              <Input
                id="import-url"
                type="url"
                placeholder="https://…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="import-title">Title (optional)</Label>
              <Input
                id="import-title"
                placeholder="Defaults to the file name"
                value={urlTitle}
                onChange={(e) => setUrlTitle(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={importing}>
                Cancel
              </Button>
              <Button type="submit" disabled={importing || url.trim().length === 0}>
                {importing ? 'Importing…' : 'Import'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
