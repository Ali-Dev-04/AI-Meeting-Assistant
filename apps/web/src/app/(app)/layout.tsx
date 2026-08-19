'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search as SearchIcon } from 'lucide-react';
import { useCurrentUser, useLogout } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { CommandPalette } from '@/components/layout/command-palette';
import { NotificationBell } from '@/components/layout/notification-bell';
import { MobileNav } from '@/components/layout/mobile-nav';

/**
 * Authenticated app shell: sidebar nav + top bar (search trigger, theme toggle,
 * user, sign out) + the global command palette.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: user, isLoading, isError } = useCurrentUser();
  const logout = useLogout();

  useEffect(() => {
    if (isError) router.replace('/login');
  }, [isError, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-4 border-b px-4">
          <Button
            variant="outline"
            size="sm"
            className="w-full max-w-xs justify-start text-muted-foreground"
            onClick={() => router.push('/search')}
          >
            <SearchIcon className="mr-2 h-4 w-4" />
            Search meetings…
            <kbd className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">
              ⌘K
            </kbd>
          </Button>

          <div className="flex items-center gap-2">
            <NotificationBell />
            <ThemeToggle />
            {user && (
              <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span>
            )}
            <Button variant="ghost" size="sm" onClick={() => logout.mutate()} disabled={logout.isPending}>
              {logout.isPending ? 'Signing out…' : 'Sign out'}
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 pb-24 lg:pb-8">{children}</main>
      </div>

      <CommandPalette />
      <MobileNav />
    </div>
  );
}
