import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { JOB_NAMES, QUEUE_NAMES } from '../../../infrastructure/queue/queue.constants';
import { PipelineService } from '../pipeline.service';

/**
 * Consumes meeting-processing jobs from the queue. Runs only in the worker process
 * (registered via WorkerModule, not AppModule), keeping heavy AI work out of the API.
 */
@Processor(QUEUE_NAMES.MEETING_PROCESSING, { concurrency: Number(process.env.BULLMQ_CONCURRENCY ?? 4) })
@Injectable()
export class MeetingProcessor extends WorkerHost {
  private readonly logger = new Logger('MeetingProcessor');

  constructor(private readonly pipeline: PipelineService) {
    super();
  }

  async process(job: Job<{ meetingId: string }>): Promise<void> {
    if (job.name !== JOB_NAMES.PROCESS_MEETING) {
      this.logger.warn(`Unknown job name: ${job.name}`);
      return;
    }
    this.logger.log(`Processing meeting ${job.data.meetingId}`);
    await this.pipeline.run(job.data.meetingId);
  }
}
