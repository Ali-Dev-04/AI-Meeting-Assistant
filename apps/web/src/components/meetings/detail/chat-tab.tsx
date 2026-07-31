'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ArrowUp, Sparkles, Square } from 'lucide-react';
import type { ChatMessage } from '@ama/shared-types';
import { streamChat, useCreateConversation } from '@/lib/api/chat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ChatTabProps {
  meetingId: string;
  /** Called when a citation chip is clicked — jumps the transcript to that segment. */
  onCitationClick: (segmentIndex: number) => void;
}

const SUGGESTIONS = [
  'What were the main action items?',
  'Summarize the key decisions.',
  'What did we agree on?',
];

export function ChatTab({ meetingId, onCitationClick }: ChatTabProps) {
  const createConversation = useCreateConversation();

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [partial, setPartial] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const idCounter = useRef(0);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, partial]);

  async function send(text?: string) {
    const question = (text ?? input).trim();
    if (!question || streaming) return;

    setInput('');
    setMessages((prev) => [
      ...prev,
      {
        id: `u${idCounter.current++}`,
        conversationId: conversationId ?? '',
        role: 'USER',
        content: question,
        citedSegmentIds: [],
        createdAt: new Date().toISOString(),
      },
    ]);
    setStreaming(true);
    setPartial('');

    let citations: number[] = [];
    let accumulated = '';

    try {
      // Lazily create a conversation for this meeting on first question.
      let convId = conversationId;
      if (!convId) {
        const conversation = await createConversation.mutateAsync(meetingId);
        convId = conversation.id;
        setConversationId(convId);
      }

      const controller = new AbortController();
      abortRef.current = controller;

      await streamChat(
        { meetingId, conversationId: convId, question, signal: controller.signal },
        {
          onToken: (delta) => {
            accumulated += delta;
            setPartial(accumulated);
          },
          onCitations: (indexes) => {
            citations = indexes;
          },
          onDone: () => {
            setMessages((prev) => [
              ...prev,
              {
                id: `a${idCounter.current++}`,
                conversationId: convId as string,
                role: 'ASSISTANT',
                content: accumulated,
                citedSegmentIds: citations,
                createdAt: new Date().toISOString(),
              },
            ]);
            setPartial('');
          },
          onError: (message) => toast.error(message),
        },
      );
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        toast.error('Chat failed', {
          description: error instanceof Error ? error.message : 'Please try again.',
        });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  return (
    <div className="flex h-[60vh] flex-col">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto pr-1">
        {messages.length === 0 && !streaming && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <Sparkles className="h-8 w-8 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">Ask anything about this meeting.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <Button key={s} variant="outline" size="sm" onClick={() => send(s)}>
                  {s}
                </Button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} onCitationClick={onCitationClick} />
        ))}

        {streaming && (
          <MessageBubble
            message={{
              id: 'streaming',
              conversationId: '',
              role: 'ASSISTANT',
              content: partial || '…',
              citedSegmentIds: [],
              createdAt: '',
            }}
            onCitationClick={onCitationClick}
            streaming
          />
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="mt-3 flex gap-2"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question…"
          disabled={streaming}
        />
        {streaming ? (
          <Button type="button" variant="outline" size="icon" onClick={() => abortRef.current?.abort()} aria-label="Stop generating">
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="submit" size="icon" disabled={!input.trim()} aria-label="Send">
            <ArrowUp className="h-4 w-4" />
          </Button>
        )}
      </form>
    </div>
  );
}

function MessageBubble({
  message,
  onCitationClick,
  streaming,
}: {
  message: ChatMessage;
  onCitationClick: (segmentIndex: number) => void;
  streaming?: boolean;
}) {
  const isUser = message.role === 'USER';
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-3 py-2 text-sm',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted',
        )}
      >
        <p className="whitespace-pre-wrap leading-relaxed">
          {message.content}
          {streaming && (
            <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-current align-middle" />
          )}
        </p>
        {!isUser && message.citedSegmentIds.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {message.citedSegmentIds.map((index) => (
              <button
                key={index}
                type="button"
                onClick={() => onCitationClick(index)}
                className="rounded bg-background/70 px-1.5 py-0.5 text-xs hover:bg-background"
              >
                ▸ {index + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
