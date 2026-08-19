'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CreditCard, LayoutDashboard, ListTodo, Search, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/tasks', label: 'Tasks', icon: ListTodo },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/billing', label: 'Billing', icon: CreditCard },
  { href: '/settings', label: 'Settings', icon: Settings },
];

/** Mobile bottom tab bar (the sidebar is desktop-only). Hidden ≥lg. */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-w-14 flex-col items-center gap-0.5 px-2 py-2 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <item.icon className="h-5 w-5" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
