import { Inject, Injectable, Logger } from '@nestjs/common';
import { MeetingStatus } from '@prisma/client';
import { IEmbeddingProvider } from '../../infrastructure/ai/embeddings/embeddings.types';
import { EMBEDDING_PROVIDER } from '../../infrastructure/ai/embeddings/embeddings.types';
import { ILLMProvider, InsightsResult } from '../../infrastructure/ai/llm/llm.types';
import { LLM_PROVIDER } from '../../infrastructure/ai/llm/llm.types';
import { ISTTProvider} from '../../infrastructure/ai/stt/stt.types';
import { STT_PROVIDER } from '../../infrastructure/ai/stt/stt.types';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { IStorage, STORAGE } from '../../infrastructure/storage/storage.types';
import { UsageService } from '../billing/usage.service';

const TARGET_WORDS_PER_CHUNK = 230;

interface ChunkDraft {
  startSegmentIndex: number;
  endSegmentIndex: number;
  text: string;
}

/**
 * The processing pipeline — runs in the WORKER process, never in the API.
 * Stages: transcribe → store transcript → extract insights → embed chunks → finalize.
 * Status is updated at each stage so the UI can show progress; on failure the meeting
 * is marked FAILED and the error re-thrown so BullMQ retries (then dead-letters).
 */
@Injectable()
export class PipelineService {
  private readonly logger = new Logger('Pipeline');

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE) private readonly storage: IStorage,
    private readonly usage: UsageService,
    @Inject(STT_PROVIDER) private readonly stt: ISTTProvider,
    @Inject(LLM_PROVIDER) private readonly llm: ILLMProvider,
    @Inject(EMBEDDING_PROVIDER) private readonly embeddings: IEmbeddingProvider,
  ) {}

  async run(meetingId: string): Promise<void> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { media: true },
    });
    if (!meeting) throw new Error(`Meeting ${meetingId} not found`);
    const media = meeting.media[0];
    if (!media) throw new Error(`No media attached to meeting ${meetingId}`);

    try {
      // Idempotency: BullMQ retries re-run the whole pipeline — wipe any partial
      // artifacts from a previous attempt so unique constraints (transcript per
      // meeting) hold and results are never duplicated.
      await this.clearArtifacts(meetingId);

      // 1) TRANSCRIBE
      await this.setStatus(meetingId, 'TRANSCRIBING');
      const audio = await this.download(media.originalStorageKey);
      const result = await this.stt.transcribe(audio, 'meeting', media.mimeType);

      await this.prisma.$transaction(async (tx) => {
        const transcript = await tx.transcript.create({
          data: { meetingId, language: result.language },
        });
        if (result.segments.length > 0) {
          await tx.transcriptSegment.createMany({
            data: result.segments.map((segment, index) => ({
              transcriptId: transcript.id,
              index,
              speakerLabel: segment.speakerLabel,
              startTimeMs: segment.startTimeMs,
              endTimeMs: segment.endTimeMs,
              text: segment.text,
            })),
          });
        }
      });
      await this.prisma.meeting.update({
        where: { id: meetingId },
        data: {
          durationSeconds: result.durationSeconds || null,
          language: result.language,
        },
      });

      // 2) SUMMARIZE / EXTRACT
      await this.setStatus(meetingId, 'SUMMARIZING');
      const segments = await this.prisma.transcriptSegment.findMany({
        where: { transcript: { meetingId } },
        orderBy: { index: 'asc' },
      });
      const transcriptText = segments.map((s) => `${s.speakerLabel}: ${s.text}`).join('\n');
      const insights = await this.llm.extractInsights(transcriptText);
      await this.persistInsights(meetingId, insights);

      // 3) INDEX (embed chunks for semantic search + RAG)
      await this.setStatus(meetingId, 'INDEXING');
      const chunks = this.chunkSegments(segments);
      if (chunks.length > 0) {
        const vectors = await this.embeddings.embed(chunks.map((c) => c.text));
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const vector = vectors[i];
          if (!chunk || !vector) continue;
          await this.insertEmbedding(meetingId, chunk, vector);
        }
      }

      // 4) FINALIZE
      await this.usage.addTranscribedSeconds(meeting.workspaceId, result.durationSeconds);
      await this.setStatus(meetingId, 'READY');
      this.logger.log(
        `Meeting ${meetingId} ready — ${segments.length} segments, ${chunks.length} chunks`,
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Pipeline failed for meeting ${meetingId}: ${reason}`);
      await this.prisma.meeting.update({
        where: { id: meetingId },
        data: { status: 'FAILED', failureReason: reason },
      });
      throw error; // let BullMQ retry, then dead-letter
    }
  }

  private async clearArtifacts(meetingId: string): Promise<void> {
    await this.prisma.embeddingChunk.deleteMany({ where: { meetingId } });
    await this.prisma.actionItem.deleteMany({ where: { meetingId } });
    await this.prisma.decision.deleteMany({ where: { meetingId } });
    await this.prisma.topic.deleteMany({ where: { meetingId } });
    await this.prisma.summary.deleteMany({ where: { meetingId } });
    await this.prisma.transcript.deleteMany({ where: { meetingId } });
  }

  private async download(storageKey: string): Promise<Buffer> {
    const url = await this.storage.getPresignedGetUrl(storageKey);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to download media (HTTP ${response.status})`);
    return Buffer.from(await response.arrayBuffer());
  }

  private async persistInsights(meetingId: string, insights: InsightsResult): Promise<void> {
    await this.prisma.summary.create({
      data: {
        meetingId,
        overview: insights.overview,
        keyPoints: insights.keyPoints,
        // Record whichever LLM actually produced the insights (OpenRouter, Anthropic, …).
        model: this.llm.modelName,
        promptVersion: '1',
      },
    });
    if (insights.actionItems.length > 0) {
      await this.prisma.actionItem.createMany({
        data: insights.actionItems.map((a) => ({ meetingId, text: a.text, assigneeText: a.assigneeText })),
      });
    }
    if (insights.decisions.length > 0) {
      await this.prisma.decision.createMany({
        data: insights.decisions.map((d) => ({ meetingId, text: d.text, context: d.context })),
      });
    }
    if (insights.topics.length > 0) {
      await this.prisma.topic.createMany({
        data: insights.topics.map((t, i) => ({ meetingId, label: t.label, summary: t.summary, sortOrder: i })),
      });
    }
  }

  private chunkSegments(segments: { index: number; text: string }[]): ChunkDraft[] {
    const chunks: ChunkDraft[] = [];
    let current: ChunkDraft | null = null;
    let words = 0;

    for (const segment of segments) {
      const segmentWords = countWords(segment.text);
      if (!current) {
        current = { startSegmentIndex: segment.index, endSegmentIndex: segment.index, text: segment.text };
        words = segmentWords;
      } else {
        current.endSegmentIndex = segment.index;
        current.text += ' ' + segment.text;
        words += segmentWords;
      }
      if (words >= TARGET_WORDS_PER_CHUNK) {
        chunks.push(current);
        current = null;
        words = 0;
      }
    }
    if (current) chunks.push(current);
    return chunks;
  }

  /**
   * Raw SQL insert because the `embedding` column is `Unsupported("vector")` in
   * Prisma — it can't write vector literals through the typed client.
   */
  private async insertEmbedding(meetingId: string, chunk: ChunkDraft, vector: number[]): Promise<void> {
    const vectorLiteral = `[${vector.join(',')}]`;
    const tokenEstimate = Math.round(countWords(chunk.text) * 1.3);
    // NOTE: the table's columns are camelCase (Prisma fields have no @map), so they
    // must be double-quoted in raw SQL — unquoted identifiers fold to lowercase.
    await this.prisma.$executeRaw`
      INSERT INTO embedding_chunks
        (id, "meetingId", "startSegmentIndex", "endSegmentIndex", text, "tokenCount", embedding, "createdAt")
      VALUES
        (gen_random_uuid(), ${meetingId}, ${chunk.startSegmentIndex}, ${chunk.endSegmentIndex},
         ${chunk.text}, ${tokenEstimate}, ${vectorLiteral}::vector, NOW())
    `;
  }

  private async setStatus(meetingId: string, status: MeetingStatus): Promise<void> {
    await this.prisma.meeting.update({ where: { id: meetingId }, data: { status } });
  }
}

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}
