import type { ReactNode } from 'react';
import { siteConfig } from '@/config/site';

/**
 * Auth layout: two-pane. Left = brand/marketing panel (hidden on mobile);
 * right = the form, centered. Route group (auth) keeps these routes out of the app shell.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-1/2 flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div className="text-lg font-semibold">{siteConfig.name}</div>
        <div className="space-y-3">
          <h1 className="text-3xl font-bold leading-tight">
            Every meeting, captured, summarized, and one question away.
          </h1>
          <p className="text-primary-foreground/80">
            Transcription, action items, decisions, and semantic search across all your meetings.
          </p>
        </div>
        <div className="text-sm text-primary-foreground/60">&copy; {`2026`} {siteConfig.name}</div>
      </aside>
      <main className="flex flex-1 items-center justify-center bg-background p-6">{children}</main>
    </div>
  );
}
