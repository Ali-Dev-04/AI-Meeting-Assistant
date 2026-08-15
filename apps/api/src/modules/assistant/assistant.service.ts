import { Inject, Injectable } from '@nestjs/common';
import {
  EMBEDDING_PROVIDER,
  IEmbeddingProvider,
} from '../../infrastructure/ai/embeddings/embeddings.types';
import { ILLMProvider, LLM_PROVIDER } from '../../infrastructure/ai/llm/llm.types';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import type { AssistantSource } from '@ama/shared-types';

interface RetrievedChunk {
  meeting_id: string;
  title: string;
  segment_index: number;
  text: string;
}

/**
 * Workspace-wide Q&A ("Ask AI"): embed the question, retrieve the most relevant
 * transcript chunks across ALL meetings, and stream a grounded answer. Stateless —
 * answers are not persisted (unlike per-meeting chat).
 */
@Injectable()
export class AssistantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaces: WorkspacesService,
    @Inject(EMBEDDING_PROVIDER) private readonly embeddings: IEmbeddingProvider,
    @Inject(LLM_PROVIDER) private readonly llm: ILLMProvider,
  ) {}

  async ask(
    userId: string,
    question: string,
    onToken: (delta: string) => void,
  ): Promise<AssistantSource[]> {
    const workspace = await this.workspaces.getActiveForUser(userId);

    const [vector] = await this.embeddings.embed([question]);
    if (!vector) return [];
    const vectorLiteral = `[${vector.join(',')}]`;

    const rows = await this.prisma.$queryRaw<RetrievedChunk[]>`
      SELECT m.id AS meeting_id, m.title,
             ec."startSegmentIndex" AS segment_index, ec.text
      FROM embedding_chunks ec
      JOIN meetings m ON m.id = ec."meetingId"
      WHERE m."workspaceId" = ${workspace.id} AND m."deletedAt" IS NULL
      ORDER BY ec.embedding <=> ${vectorLiteral}::vector
      LIMIT 8`;

    if (rows.length === 0) return [];

    // streamAnswer prefixes each entry with [Excerpt i]; tag the source meeting inside.
    const context = rows.map((row) => `from "${row.title}": ${row.text}`);
    await this.llm.streamAnswer(question, context, [], onToken);

    return rows.map((row) => ({
      meetingId: row.meeting_id,
      title: row.title,
      segmentIndex: row.segment_index,
    }));
  }
}
