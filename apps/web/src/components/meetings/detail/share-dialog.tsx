'use client';

import { useState } from 'react';
import { Check, Copy, Link2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ShareLink, ShareRole } from '@ama/shared-types';
import { useCreateShareLink, useRevokeShareLink, useShareLinks } from '@/lib/api/meetings';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatDate } from '@/lib/utils';

const EXPIRY_OPTIONS = [
  { label: 'No expiry', value: 0 },
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
];

const selectClass =
  'h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function ShareDialog({
  meetingId,
  open,
  onOpenChange,
}: {
  meetingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: links, isLoading } = useShareLinks(meetingId);
  const create = useCreateShareLink(meetingId);
  const revoke = useRevokeShareLink(meetingId);
  const [role, setRole] = useState<ShareRole>('VIEWER');
  const [expiresInDays, setExpiresInDays] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);

  function createLink() {
    create.mutate(
      { role, ...(expiresInDays > 0 ? { expiresInDays } : {}) },
      {
        onSuccess: (link) => {
          toast.success('Share link created');
          void copy(link.url, link.id);
        },
        onError: () => toast.error("Couldn't create the link."),
      },
    );
  }

  async function copy(url: string, id: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error('Copy failed — select the URL manually.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share meeting</DialogTitle>
          <DialogDescription>
            Anyone with the link can view the summary and transcript. You can revoke it anytime.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <label className="space-y-1 text-xs text-muted-foreground">
              <span>Role</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as ShareRole)}
                className={selectClass}
              >
                <option value="VIEWER">Viewer</option>
                <option value="COMMENTER">Commenter</option>
              </select>
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              <span>Expires</span>
              <select
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(Number(e.target.value))}
                className={selectClass}
              >
                {EXPIRY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <Button size="sm" onClick={createLink} disabled={create.isPending}>
              <Link2 className="mr-1 h-4 w-4" />
              {create.isPending ? 'Creating…' : 'Create link'}
            </Button>
          </div>

          <div className="space-y-2">
            {isLoading ? (
              <Skeleton className="h-14 w-full" />
            ) : !links || links.length === 0 ? (
              <p className="text-sm text-muted-foreground">No links yet — create one above.</p>
            ) : (
              links.map((link) => (
                <div
                  key={link.id}
                  className={cn('space-y-1 rounded-md border p-2', link.revokedAt && 'opacity-60')}
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs capitalize">
                      {link.role.toLowerCase()}
                    </span>
                    {link.expiresAt && (
                      <span className="text-xs text-muted-foreground">
                        Expires {formatDate(link.expiresAt)}
                      </span>
                    )}
                    {link.revokedAt && <span className="text-xs text-destructive">Revoked</span>}
                    <div className="ml-auto flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => copy(link.url, link.id)}
                        disabled={!!link.revokedAt}
                        aria-label="Copy link"
                      >
                        {copied === link.id ? (
                          <Check className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      {!link.revokedAt && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            revoke.mutate(link.id, {
                              onSuccess: () => toast.success('Link revoked'),
                              onError: () => toast.error("Couldn't revoke the link."),
                            })
                          }
                          aria-label="Revoke link"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="truncate rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
                    {link.url}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
