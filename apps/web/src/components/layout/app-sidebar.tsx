'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CreditCard, LayoutDashboard, ListTodo, Search, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { siteConfig } from '@/config/site';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tasks', label: 'Tasks', icon: ListTodo },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/billing', label: 'Billing', icon: CreditCard },
  { href: '/settings', label: 'Settings', icon: Settings },
];

/** Desktop sidebar. (Mobile uses the top bar + ⌘K; a bottom tab bar is a follow-up.) */
export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-card lg:flex">
      <div className="flex h-14 items-center border-b px-4 font-semibold">{siteConfig.name}</div>
      <nav className="flex-1 space-y-1 p-2">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <item.icon className="h-4 w-4" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3 text-xs text-muted-foreground">Press ⌘K for commands</div>
    </aside>
  );
}
