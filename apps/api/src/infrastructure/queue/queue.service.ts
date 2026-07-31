import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JOB_NAMES, QUEUE_NAMES } from './queue.constants';

export const MEETING_PROCESSING_QUEUE = Symbol(QUEUE_NAMES.MEETING_PROCESSING);

/**
 * Producer side of the processing pipeline. The API enqueues a job here on upload
 * completion; the worker (separate process) consumes it. Retries with exponential
 * backoff; failed jobs land in BullMQ's dead-letter (failed set) for inspection.
 */
@Injectable()
export class QueueService {
  private readonly logger = new Logger('Queue');

  constructor(@InjectQueue(QUEUE_NAMES.MEETING_PROCESSING) private readonly queue: Queue) {}

  enqueueMeetingProcessing(meetingId: string) {
    this.logger.log(`Enqueuing processing for meeting ${meetingId}`);
    return this.queue.add(
      JOB_NAMES.PROCESS_MEETING,
      { meetingId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 10_000 },
        removeOnComplete: { age: 3600, count: 1000 },
        removeOnFail: { age: 24 * 3600 },
      },
    );
  }
}
