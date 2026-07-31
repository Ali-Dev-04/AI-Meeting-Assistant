import { Inject, Injectable } from '@nestjs/common';
import { ChatRole } from '@prisma/client';
import { NotFoundError } from '../../common/errors';
import { IEmbeddingProvider } from '../../infrastructure/ai/embeddings/embeddings.types';
import { EMBEDDING_PROVIDER } from '../../infrastructure/ai/embeddings/embeddings.types';
import { ChatTurn, ILLMProvider} from '../../infrastructure/ai/llm/llm.types';
import { LLM_PROVIDER } from '../../infrastructure/ai/llm/llm.types';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { MeetingsService } from '../meetings/meetings.service';

interface ContextChunk {
  text: string;
  segmentIndex: number;
}

/**
 * Meeting Q&A via RAG: embed the question, retrieve the most relevant transcript
 * chunks (scoped to this meeting), stream a grounded answer, and cite the source
 * segments. Citations come from the retrieved chunks — not the model — so they're
 * always trustworthy and clickable back into the transcript.
 */
@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meetings: MeetingsService,
    @Inject(EMBEDDING_PROVIDER) private readonly embeddings: IEmbeddingProvider,
    @Inject(LLM_PROVIDER) private readonly llm: ILLMProvider,
  ) {}

  async createConversation(meetingId: string, userId: string) {
    await this.meetings.getForUser(meetingId, userId); // access check
    return this.prisma.chatConversation.create({ data: { meetingId, userId } });
  }

  async listMessages(meetingId: string, conversationId: string, userId: string) {
    const conversation = await this.resolveConversation(meetingId, conversationId, userId);
    const messages = await this.prisma.chatMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
    });
    return messages.map(toMessageDto);
  }

  async streamAnswer(
    meetingId: string,
    conversationId: string,
    question: string,
    userId: string,
    onToken: (delta: string) => void,
  ) {
    const conversation = await this.resolveConversation(meetingId, conversationId, userId);

    // Fetch prior turns BEFORE persisting the new question, so history excludes it.
    const history = await this.getHistory(conversation.id);

    await this.prisma.chatMessage.create({
      data: { conversationId: conversation.id, role: 'USER', content: question, citedSegmentIds: [] },
    });

    const context = await this.retrieveContext(meetingId, question);
    const answer = await this.llm.streamAnswer(
      question,
      context.map((c) => c.text),
      history,
      onToken,
    );
    const citations = context.map((c) => c.segmentIndex);

    const assistant = await this.prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        content: answer,
        citedSegmentIds: citations,
      },
    });

    return { answer, citations, assistantMessageId: assistant.id };
  }

  /** Last ~6 turns for multi-turn memory (windowed to bound token cost). */
  private async getHistory(conversationId: string): Promise<ChatTurn[]> {
    const recent = await this.prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });
    return recent
      .reverse()
      .map((message) => ({
        role: message.role === 'USER' ? 'user' : 'assistant',
        content: message.content,
      }));
  }

  private async resolveConversation(meetingId: string, conversationId: string, userId: string) {
    await this.meetings.getForUser(meetingId, userId);
    const conversation = await this.prisma.chatConversation.findFirst({
      where: { id: conversationId, meetingId, userId },
    });
    if (!conversation) throw new NotFoundError('Conversation');
    return conversation;
  }

  private async retrieveContext(meetingId: string, question: string): Promise<ContextChunk[]> {
    const [vector] = await this.embeddings.embed([question]);
    if (!vector) return [];
    const vectorLiteral = `[${vector.join(',')}]`;
    const rows = await this.prisma.$queryRaw<Array<{ text: string; segment_index: number }>>`
      SELECT text, start_segment_index AS segment_index
      FROM embedding_chunks
      WHERE meeting_id = ${meetingId}
      ORDER BY embedding <=> ${vectorLiteral}::vector
      LIMIT 5`;
    return rows.map((row) => ({ text: row.text, segmentIndex: row.segment_index }));
  }
}

function toMessageDto(message: {
  id: string;
  conversationId: string;
  role: ChatRole;
  content: string;
  citedSegmentIds: unknown;
  createdAt: Date;
}) {
  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role,
    content: message.content,
    citedSegmentIds: (message.citedSegmentIds as number[]) ?? [],
    createdAt: message.createdAt.toISOString(),
  };
}
