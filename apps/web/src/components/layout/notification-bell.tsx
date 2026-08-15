'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/lib/api/notifications';
import { Button } from '@/components/ui/button';
import { cn, formatDate } from '@/lib/utils';

/** Header bell: unread badge, dropdown of the latest notifications, mark-read. */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { data } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const unread = data?.unreadCount ?? 0;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
        className="relative"
        onClick={() => setOpen((value) => !value)}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Button>

      {open && (
        <>
          {/* Click-outside backdrop (no dropdown primitive in the UI kit). */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-80 rounded-lg border bg-background p-2 shadow-lg">
            <div className="flex items-center justify-between px-2 pb-2 pt-1">
              <span className="text-sm font-semibold">Notifications</span>
              {unread > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAll.mutate()}
                  disabled={markAll.isPending}
                >
                  Mark all read
                </Button>
              )}
            </div>

            {!data || data.items.length === 0 ? (
              <p className="px-2 pb-2 text-sm text-muted-foreground">You&rsquo;re all caught up.</p>
            ) : (
              <ul className="max-h-80 overflow-y-auto">
                {data.items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={cn(
                        'w-full rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent',
                        !n.readAt && 'bg-accent/60',
                      )}
                      onClick={() => {
                        if (!n.readAt) markRead.mutate(n.id);
                        setOpen(false);
                        if (n.meetingId) router.push(`/meetings/${n.meetingId}`);
                      }}
                    >
                      <span className="block leading-snug">{n.title}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {formatDate(n.createdAt)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
