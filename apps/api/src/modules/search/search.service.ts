import { Inject, Injectable } from '@nestjs/common';
import { SearchMode, SearchResult } from '@ama/shared-types';
import { IEmbeddingProvider } from '../../infrastructure/ai/embeddings/embeddings.types';
import { EMBEDDING_PROVIDER } from '../../infrastructure/ai/embeddings/embeddings.types';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';

interface VectorRow {
  meeting_id: string;
  title: string;
  occurred_at: Date;
  text: string;
  segment_index: number;
  score: number;
}

/**
 * Hybrid meeting search. Semantic = pgvector ANN over embedding chunks; keyword =
 * ILIKE over transcript segments; hybrid merges both and de-dupes by meeting.
 * All queries are workspace-scoped (tenant isolation).
 */
@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaces: WorkspacesService,
    @Inject(EMBEDDING_PROVIDER) private readonly embeddings: IEmbeddingProvider,
  ) {}

  async search(userId: string, query: string, mode: SearchMode): Promise<SearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const workspace = await this.workspaces.getActiveForUser(userId);

    if (mode === 'keyword') return this.keyword(workspace.id, trimmed);

    const [vector] = await this.embeddings.embed([trimmed]);
    if (!vector) return [];
    const semantic = await this.semantic(workspace.id, vector);
    if (mode === 'semantic') return semantic;

    return this.merge(semantic, await this.keyword(workspace.id, trimmed));
  }

  private async semantic(workspaceId: string, vector: number[]): Promise<SearchResult[]> {
    const vectorLiteral = `[${vector.join(',')}]`;
    const rows = await this.prisma.$queryRaw<VectorRow[]>`
      SELECT m.id AS meeting_id, m.title, m."occurredAt" AS occurred_at, ec.text,
             ec."startSegmentIndex" AS segment_index,
             (1 - (ec.embedding <=> ${vectorLiteral}::vector)) AS score
      FROM embedding_chunks ec
      JOIN meetings m ON m.id = ec."meetingId"
      WHERE m."workspaceId" = ${workspaceId} AND m."deletedAt" IS NULL
      ORDER BY ec.embedding <=> ${vectorLiteral}::vector
      LIMIT 20`;

    return dedupeByMeeting(
      rows.map((row) => ({
        meetingId: row.meeting_id,
        meetingTitle: row.title,
        occurredAt: row.occurred_at.toISOString(),
        score: clamp(row.score),
        snippet: row.text.slice(0, 240),
        matchedSegmentIndex: row.segment_index,
      })),
    );
  }

  private async keyword(workspaceId: string, query: string): Promise<SearchResult[]> {
    const segments = await this.prisma.transcriptSegment.findMany({
      where: {
        text: { contains: query, mode: 'insensitive' },
        transcript: { meeting: { workspaceId, deletedAt: null } },
      },
      include: { transcript: { include: { meeting: true } } },
      take: 40,
    });

    return dedupeByMeeting(
      segments.map((segment) => ({
        meetingId: segment.transcript.meeting.id,
        meetingTitle: segment.transcript.meeting.title,
        occurredAt: segment.transcript.meeting.occurredAt.toISOString(),
        score: 0.5,
        snippet: segment.text.slice(0, 240),
        matchedSegmentIndex: segment.index,
      })),
    );
  }

  private merge(semantic: SearchResult[], keyword: SearchResult[]): SearchResult[] {
    const byMeeting = new Map<string, SearchResult>();
    for (const result of [...semantic, ...keyword]) {
      const existing = byMeeting.get(result.meetingId);
      if (!existing || result.score > existing.score) byMeeting.set(result.meetingId, result);
    }
    return [...byMeeting.values()].sort((a, b) => b.score - a.score).slice(0, 20);
  }
}

function dedupeByMeeting(results: SearchResult[]): SearchResult[] {
  const byMeeting = new Map<string, SearchResult>();
  for (const result of results) {
    if (!byMeeting.has(result.meetingId)) byMeeting.set(result.meetingId, result);
  }
  return [...byMeeting.values()];
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}
