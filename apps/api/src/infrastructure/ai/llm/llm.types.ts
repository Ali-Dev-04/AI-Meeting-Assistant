/** Structured output the LLM extracts from a transcript. */
export interface ActionItemDraft {
  text: string;
  assigneeText: string | null;
}

export interface DecisionDraft {
  text: string;
  context: string | null;
}

export interface TopicDraft {
  label: string;
  summary: string | null;
}

export interface InsightsResult {
  overview: string;
  keyPoints: string[];
  actionItems: ActionItemDraft[];
  decisions: DecisionDraft[];
  topics: TopicDraft[];
}

/** A single prior turn in a chat conversation (for multi-turn memory). */
export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

/** Provider-agnostic LLM contract. Swap Anthropic → OpenRouter by rebinding the token. */
export interface ILLMProvider {
  /** Model identifier recorded on generated artifacts (e.g. Summary.model). */
  readonly modelName: string;
  extractInsights(transcript: string): Promise<InsightsResult>;
  /** Stream a grounded answer token-by-token; `onToken` is called per delta. */
  streamAnswer(
    question: string,
    context: string[],
    history: ChatTurn[],
    onToken: (delta: string) => void,
  ): Promise<string>;
}

export const LLM_PROVIDER = Symbol('LLM_PROVIDER');
