'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, Search, Settings, Upload } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

/**
 * Global ⌘K command palette. Toggled with Cmd/Ctrl+K. Provides quick navigation
 * and actions. Built on cmdk, which gives keyboard nav + filtering for free.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  function go(path: string) {
    setOpen(false);
    router.push(path);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0">
        <Command>
          <CommandInput placeholder="Type a command or search…" />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Navigate">
              <CommandItem onSelect={() => go('/dashboard')}>
                <LayoutDashboard className="mr-2 h-4 w-4" aria-hidden />
                Dashboard
              </CommandItem>
              <CommandItem onSelect={() => go('/search')}>
                <Search className="mr-2 h-4 w-4" aria-hidden />
                Search meetings
              </CommandItem>
              <CommandItem onSelect={() => go('/settings')}>
                <Settings className="mr-2 h-4 w-4" aria-hidden />
                Settings
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="Actions">
              <CommandItem onSelect={() => go('/dashboard')}>
                <Upload className="mr-2 h-4 w-4" aria-hidden />
                Upload meeting
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
