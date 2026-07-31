/** BullMQ queue names. A single pipeline queue holds the multi-stage processing jobs. */
export const QUEUE_NAMES = {
  MEETING_PROCESSING: 'meeting-processing',
} as const;

/** Job names within the processing queue (one job drives the whole pipeline). */
export const JOB_NAMES = {
  PROCESS_MEETING: 'process-meeting',
} as const;
