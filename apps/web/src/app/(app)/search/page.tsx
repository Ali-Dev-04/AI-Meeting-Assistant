'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search as SearchIcon } from 'lucide-react';
import type { SearchResult, SearchMode } from '@ama/shared-types';
import { useSearch } from '@/lib/api/search';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';

const MODES: SearchMode[] = ['hybrid', 'semantic', 'keyword'];

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [mode, setMode] = useState<SearchMode>('hybrid');

  // Debounce so we don't fire a search on every keystroke.
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(handle);
  }, [query]);

  const { data, isFetching } = useSearch({ q: debounced, mode });
  const hasQuery = debounced.trim().length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
        <p className="text-sm text-muted-foreground">
          Find meetings by meaning, not just keywords.
        </p>
      </div>

      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. pricing objections"
          className="pl-9"
          autoFocus
        />
      </div>

      <div className="flex gap-2">
        {MODES.map((m) => (
          <Button
            key={m}
            variant={mode === m ? 'default' : 'outline'}
            size="sm"
            className="capitalize"
            onClick={() => setMode(m)}
          >
            {m}
          </Button>
        ))}
      </div>

      {!hasQuery ? (
        <p className="text-sm text-muted-foreground">
          Start typing to search across all your meetings.
        </p>
      ) : isFetching ? (
        <ResultsSkeleton />
      ) : data && data.length > 0 ? (
        <Results results={data} />
      ) : (
        <p className="text-sm text-muted-foreground">No matches found. Try different words or mode.</p>
      )}
    </div>
  );
}

function Results({ results }: { results: SearchResult[] }) {
  return (
    <div className="space-y-2">
      {results.map((result) => (
        <Link
          key={result.meetingId}
          href={`/meetings/${result.meetingId}`}
          className="block rounded-lg border p-4 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex items-center justify-between gap-4">
            <span className="truncate font-medium">{result.meetingTitle}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {Math.round(result.score * 100)}% match
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{formatDate(result.occurredAt)}</p>
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">…{result.snippet}…</p>
        </Link>
      ))}
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  );
}
