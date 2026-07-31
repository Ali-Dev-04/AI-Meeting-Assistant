import { Injectable, Logger } from '@nestjs/common';
import { env } from '../../../config/env';
import { ISTTProvider, SttSegment, TranscriptResult } from './stt.types';

interface WhisperVerboseSegment {
  start: number;
  end: number;
  text: string;
}

/**
 * Self-hosted Whisper provider. Assumes an OpenAI-compatible transcription endpoint
 * (e.g. a container exposing POST /v1/audio/transcriptions with verbose_json output).
 * Speaker diarization beyond "Speaker 1" requires a diarization-capable backend —
 * swap the provider to upgrade.
 */
@Injectable()
export class WhisperProvider implements ISTTProvider {
  private readonly logger = new Logger('Whisper');

  async transcribe(audio: Buffer, filename: string, _mimeType: string): Promise<TranscriptResult> {
    const form = new FormData();
    form.append('file', new Blob([audio]), filename);
    form.append('model', 'whisper-1');
    form.append('response_format', 'verbose_json');

    const response = await fetch(`${env.STT_ENDPOINT}/v1/audio/transcriptions`, {
      method: 'POST',
      body: form,
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Whisper transcription failed (${response.status}): ${detail}`);
    }

    const data = (await response.json()) as {
      language?: string;
      duration?: number;
      segments?: WhisperVerboseSegment[];
      text?: string;
    };

    const segments: SttSegment[] = (data.segments ?? []).map((segment) => ({
      startTimeMs: Math.round(segment.start * 1000),
      endTimeMs: Math.round(segment.end * 1000),
      text: segment.text.trim(),
      speakerLabel: 'Speaker 1',
    }));

    this.logger.log(`Transcribed ${segments.length} segments`);

    return {
      segments,
      language: data.language ?? 'en',
      durationSeconds: Math.round(data.duration ?? 0),
    };
  }
}
