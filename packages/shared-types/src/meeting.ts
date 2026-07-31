import { z } from 'zod';

/** Meeting lifecycle status (mirrors the DB enum in schema.prisma). */
export const meetingStatusSchema = z.enum([
  'QUEUED',
  'TRANSCRIBING',
  'SUMMARIZING',
  'INDEXING',
  'READY',
  'FAILED',
]);
export type MeetingStatus = z.infer<typeof meetingStatusSchema>;

export const meetingSourceSchema = z.enum(['UPLOAD', 'BOT']);
export type MeetingSourceType = z.infer<typeof meetingSourceSchema>;

export interface Meeting {
  id: string;
  workspaceId: string;
  title: string;
  occurredAt: string;
  sourceType: MeetingSourceType;
  status: MeetingStatus;
  ownerId: string;
  language: string;
  durationSeconds: number | null;
  createdAt: string;
  updatedAt: string;
}

/** Request to create a meeting and obtain a presigned upload URL. */
export const createMeetingSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title is too long'),
});
export type CreateMeetingValues = z.infer<typeof createMeetingSchema>;

export interface CreateMeetingRequest {
  title: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

/** Response to POST /meetings: the new meeting id + where to PUT the file. */
export interface CreateMeetingResponse {
  id: string;
  uploadUrl: string;
  headers?: Record<string, string>;
}

export interface MeetingListParams {
  cursor?: string;
  limit?: number;
  status?: MeetingStatus;
  q?: string;
}

/** Upload constraints (enforced client-side AND server-side). */
export const ALLOWED_UPLOAD_MIME = [
  'audio/wav',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'video/mp4',
  'video/quicktime',
] as const;
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB
