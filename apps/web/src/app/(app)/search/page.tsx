'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search as SearchIcon, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { AssistantSource, SearchResult, SearchMode } from '@ama/shared-types';
import { useSearch } from '@/lib/api/search';
import { streamAssistant } from '@/lib/api/assistant';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';

/** UI mode: the three API search modes + the client-side "Ask AI" assistant. */
type Mode = SearchMode | 'ask';

const MODES: Mode[] = ['ask', 'hybrid', 'semantic', 'keyword'];

const SEARCH_MODES: SearchMode[] = ['hybrid', 'semantic', 'keyword'];

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode');

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [mode, setMode] = useState<Mode>(
    initialMode === 'ask' || SEARCH_MODES.includes(initialMode as SearchMode)
      ? (initialMode as Mode)
      : 'hybrid',
  );

  // Ask-AI state (streamed answer + cited meetings).
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState<AssistantSource[]>([]);
  const [asking, setAsking] = useState(false);

  // Debounce so we don't fire a search on every keystroke.
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(handle);
  }, [query]);

  const isAsk = mode === 'ask';
  // In Ask mode the API search stays dormant (empty q → useSearch disables itself).
  const { data, isFetching } = useSearch({
    q: isAsk ? '' : debounced,
    mode: (isAsk ? 'hybrid' : mode) as SearchMode,
  });
  const hasQuery = debounced.trim().length > 0;

  function runAsk() {
    const question = query.trim();
    if (!question || asking) return;
    setAnswer('');
    setSources([]);
    setAsking(true);
    void streamAssistant(question, {
      onToken: (delta) => setAnswer((current) => current + delta),
      onSources: setSources,
      onDone: () => setAsking(false),
      onError: (message) => {
        toast.error(message || 'Assistant failed.');
        setAsking(false);
      },
    }).catch((error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Assistant failed.');
      setAsking(false);
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
        <p className="text-sm text-muted-foreground">
          Find meetings by meaning — or ask a question across all of them.
        </p>
      </div>

      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && isAsk) runAsk();
          }}
          placeholder={isAsk ? 'e.g. What did we decide about pricing?' : 'e.g. pricing objections'}
          className="pl-9"
          autoFocus
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {MODES.map((m) => (
          <Button
            key={m}
            variant={mode === m ? 'default' : 'outline'}
            size="sm"
            className={m === 'ask' ? 'capitalize' : 'capitalize'}
            onClick={() => {
              setMode(m);
              if (m === 'ask') router.replace('/search?mode=ask');
              else router.replace('/search');
            }}
          >
            {m === 'ask' && <Sparkles className="mr-1 h-3.5 w-3.5" />}
            {m === 'ask' ? 'Ask AI' : m}
          </Button>
        ))}
        {isAsk && (
          <Button size="sm" onClick={runAsk} disabled={asking || query.trim().length === 0} className="ml-auto">
            {asking ? 'Thinking…' : 'Ask'}
          </Button>
        )}
      </div>

      {isAsk ? (
        <div className="space-y-4">
          {asking && answer.length === 0 && <Skeleton className="h-24 w-full" />}
          {answer.length > 0 && (
            <div className="rounded-lg border bg-card p-4 text-sm leading-relaxed whitespace-pre-wrap">
              {answer}
              {asking && <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-primary align-middle" />}
            </div>
          )}
          {sources.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sources</p>
              <div className="flex flex-wrap gap-2">
                {sources.map((source, i) => (
                  <Link
                    key={`${source.meetingId}-${i}`}
                    href={`/meetings/${source.meetingId}?tab=transcript`}
                    className="rounded-full border px-3 py-1 text-xs transition-colors hover:bg-accent"
                  >
                    {source.title}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {!hasQuery && !asking && (
            <p className="text-sm text-muted-foreground">
              Ask anything about your meetings — answers cite the meetings they came from.
            </p>
          )}
        </div>
      ) : !hasQuery ? (
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
