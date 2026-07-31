import { z } from 'zod';
import { Meeting } from '@prisma/client';

/** Full server-side validation for POST /meetings (the form only validates `title`). */
export const createMeetingRequestSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});

export function toMeetingDto(meeting: Meeting) {
  return {
    id: meeting.id,
    workspaceId: meeting.workspaceId,
    title: meeting.title,
    occurredAt: meeting.occurredAt.toISOString(),
    sourceType: meeting.sourceType,
    status: meeting.status,
    ownerId: meeting.ownerId,
    language: meeting.language,
    durationSeconds: meeting.durationSeconds,
    createdAt: meeting.createdAt.toISOString(),
    updatedAt: meeting.updatedAt.toISOString(),
  };
}
