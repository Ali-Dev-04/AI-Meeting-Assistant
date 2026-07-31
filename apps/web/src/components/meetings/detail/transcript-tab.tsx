'use client';

import { useEffect, useMemo, useRef, useState, type Ref } from 'react';
import { Highlighter, MessageSquare, Pin, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Comment, CommentType, TranscriptSegment } from '@ama/shared-types';
import {
  useCreateComment,
  useDeleteComment,
  useMeetingComments,
  useMeetingPlayback,
  useMeetingTranscript,
} from '@/lib/api/meetings';
import { useCurrentUser } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { cn, formatDate } from '@/lib/utils';

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

interface TranscriptTabProps {
  meetingId: string;
  /** Segment index to seek to (set when arriving from a chat citation). */
  seekIndex?: number | null;
  onSeekConsumed?: () => void;
}

export function TranscriptTab({ meetingId, seekIndex, onSeekConsumed }: TranscriptTabProps) {
  const { data: transcript, isLoading } = useMeetingTranscript(meetingId);
  const { data: playback } = useMeetingPlayback(meetingId);
  const { data: user } = useCurrentUser();
  const audioRef = useRef<HTMLAudioElement>(null);
  const composeRef = useRef<HTMLTextAreaElement>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [anchorSegmentId, setAnchorSegmentId] = useState<string | null>(null);
  const [flashSegmentId, setFlashSegmentId] = useState<string | null>(null);

  const segments = transcript?.segments ?? [];
  const segmentById = useMemo(() => new Map(segments.map((s) => [s.id, s])), [segments]);

  const activeIndex = segments.reduce(
    (acc, seg, i) => (seg.startTimeMs <= currentTimeMs ? i : acc),
    -1,
  );

  function seekTo(ms: number) {
    const audio = audioRef.current;
    if (audio) audio.currentTime = ms / 1000;
    setCurrentTimeMs(ms);
  }

  // When a chat citation targets a segment, seek once the transcript has loaded.
  useEffect(() => {
    if (seekIndex == null) return;
    if (segments.length === 0) return; // wait for load, then this effect re-runs
    const target = segments.find((s) => s.index === seekIndex);
    if (target) seekTo(target.startTimeMs);
    onSeekConsumed?.();
  }, [seekIndex, segments]);

  function anchorTo(segmentId: string) {
    setAnchorSegmentId(segmentId);
    composeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => composeRef.current?.focus(), 200);
  }

  function jumpToSegment(segmentId: string) {
    const seg = segmentById.get(segmentId);
    if (seg) seekTo(seg.startTimeMs);
    document
      .getElementById(`segment-${segmentId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFlashSegmentId(segmentId);
    setTimeout(() => setFlashSegmentId(null), 2000);
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!transcript || segments.length === 0) {
    return <p className="text-sm text-muted-foreground">Transcript isn&rsquo;t available yet.</p>;
  }

  const anchorSeg = anchorSegmentId ? segmentById.get(anchorSegmentId) : null;

  return (
    <div className="space-y-4">
      {playback?.playbackUrl && (
        <audio
          ref={audioRef}
          src={playback.playbackUrl}
          controls
          className="w-full"
          onTimeUpdate={(e) => setCurrentTimeMs(e.currentTarget.currentTime * 1000)}
        />
      )}

      <div className="max-h-[55vh] space-y-1 overflow-y-auto pr-1">
        {segments.map((segment, i) => (
          <SegmentRow
            key={segment.id}
            segment={segment}
            active={i === activeIndex}
            flashing={flashSegmentId === segment.id}
            onClick={() => seekTo(segment.startTimeMs)}
            onComment={() => anchorTo(segment.id)}
          />
        ))}
      </div>

      <CommentsSection
        meetingId={meetingId}
        currentUserId={user?.id}
        anchorSeg={anchorSeg ? { id: anchorSeg.id, startTimeMs: anchorSeg.startTimeMs } : null}
        onClearAnchor={() => setAnchorSegmentId(null)}
        onJump={jumpToSegment}
        composeRef={composeRef}
      />
    </div>
  );
}

function SegmentRow({
  segment,
  active,
  flashing,
  onClick,
  onComment,
}: {
  segment: TranscriptSegment;
  active: boolean;
  flashing: boolean;
  onClick: () => void;
  onComment: () => void;
}) {
  return (
    <div
      id={`segment-${segment.id}`}
      className={cn(
        'group flex w-full items-start gap-1 rounded-md p-2 transition-colors hover:bg-accent',
        active && 'bg-accent',
        flashing && 'ring-2 ring-primary ring-offset-1',
      )}
    >
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-start gap-3 text-left">
        <span className="w-12 shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground">
          {formatTimestamp(segment.startTimeMs)}
        </span>
        <div className="min-w-0 space-y-0.5">
          <span className="text-xs font-medium text-muted-foreground">{segment.speakerLabel}</span>
          <p className={cn('text-sm leading-relaxed', active && 'font-medium')}>{segment.text}</p>
        </div>
      </button>
      <button
        type="button"
        onClick={onComment}
        aria-label="Comment on this segment"
        className="mt-0.5 shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
      >
        <MessageSquare className="h-4 w-4" />
      </button>
    </div>
  );
}

function CommentsSection({
  meetingId,
  currentUserId,
  anchorSeg,
  onClearAnchor,
  onJump,
  composeRef,
}: {
  meetingId: string;
  currentUserId?: string;
  anchorSeg: { id: string; startTimeMs: number } | null;
  onClearAnchor: () => void;
  onJump: (segmentId: string) => void;
  composeRef: Ref<HTMLTextAreaElement>;
}) {
  const { data: comments, isLoading } = useMeetingComments(meetingId);
  const create = useCreateComment(meetingId);
  const del = useDeleteComment(meetingId);
  const [body, setBody] = useState('');
  const [type, setType] = useState<CommentType>('COMMENT');

  function submit() {
    const text = body.trim();
    if (!text) return;
    create.mutate(
      { body: text, type, transcriptSegmentId: anchorSeg?.id ?? null },
      {
        onSuccess: () => {
          setBody('');
          onClearAnchor();
          toast.success(type === 'HIGHLIGHT' ? 'Highlight added' : 'Comment added');
        },
        onError: () => toast.error("Couldn't add the comment."),
      },
    );
  }

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Comments {comments ? `(${comments.length})` : ''}
      </h2>

      <div className="space-y-2">
        {anchorSeg && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Pin className="h-3 w-3" aria-hidden />
            Anchored to {formatTimestamp(anchorSeg.startTimeMs)}
            <button type="button" onClick={onClearAnchor} className="ml-1 text-destructive hover:underline">
              remove
            </button>
          </div>
        )}
        <Textarea
          ref={composeRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment or highlight…  (⌘/Ctrl+Enter to post)"
          rows={2}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit();
          }}
        />
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1">
            {(['COMMENT', 'HIGHLIGHT'] as const).map((t) => (
              <Button
                key={t}
                type="button"
                size="sm"
                variant={type === t ? 'default' : 'outline'}
                onClick={() => setType(t)}
              >
                {t === 'HIGHLIGHT' ? (
                  <Highlighter className="mr-1 h-3.5 w-3.5" />
                ) : (
                  <MessageSquare className="mr-1 h-3.5 w-3.5" />
                )}
                {t === 'COMMENT' ? 'Comment' : 'Highlight'}
              </Button>
            ))}
          </div>
          <Button type="button" size="sm" onClick={submit} disabled={!body.trim() || create.isPending}>
            {create.isPending ? 'Posting…' : 'Post'}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : !comments || comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet. Start the discussion.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <CommentRow
              key={c.id}
              comment={c}
              canDelete={c.userId === currentUserId}
              onDelete={() =>
                del.mutate(c.id, {
                  onSuccess: () => toast.success('Comment deleted'),
                  onError: () => toast.error("Couldn't delete the comment."),
                })
              }
              onJump={onJump}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function CommentRow({
  comment,
  canDelete,
  onDelete,
  onJump,
}: {
  comment: Comment;
  canDelete: boolean;
  onDelete: () => void;
  onJump: (segmentId: string) => void;
}) {
  const isHighlight = comment.type === 'HIGHLIGHT';
  return (
    <li
      className={cn(
        'space-y-1 rounded-md p-2',
        isHighlight && 'border-l-2 border-amber-400 bg-amber-50/50 dark:bg-amber-500/5',
      )}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {isHighlight ? (
          <Highlighter className="h-3 w-3 text-amber-500" />
        ) : (
          <MessageSquare className="h-3 w-3" />
        )}
        <span className="font-medium text-foreground">{comment.authorName ?? comment.authorEmail}</span>
        {comment.transcriptSegmentId && comment.segmentStartMs != null && (
          <button
            type="button"
            onClick={() => onJump(comment.transcriptSegmentId as string)}
            className="tabular-nums hover:underline"
          >
            {formatTimestamp(comment.segmentStartMs)}
          </button>
        )}
        <span className="ml-auto">{formatDate(comment.createdAt)}</span>
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete comment"
            className="text-muted-foreground transition-colors hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <p className="text-sm leading-relaxed">{comment.body}</p>
    </li>
  );
}
