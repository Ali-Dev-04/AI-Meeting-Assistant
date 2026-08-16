import { Injectable, Logger } from '@nestjs/common';
import { env } from '../../../config/env';
import { ISTTProvider, SttSegment, TranscriptResult } from './stt.types';

interface WhisperVerboseSegment {
  start: number;
  end: number;
  text: string;
}

/** Some APIs detect the audio format from the file extension — make sure it has one. */
const EXTENSIONS: Record<string, string> = {
  'audio/mpeg': '.mp3',
  'audio/mp3': '.mp3',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
  'audio/mp4': '.mp4',
  'video/mp4': '.mp4',
  'audio/webm': '.webm',
  'video/webm': '.webm',
  'audio/m4a': '.m4a',
  'audio/x-m4a': '.m4a',
  'audio/ogg': '.ogg',
};

/**
 * Whisper provider for any OpenAI-compatible transcription endpoint — self-hosted
 * (container exposing /v1/audio/transcriptions) or hosted (Groq whisper-large-v3,
 * OpenAI whisper-1). Set STT_ENDPOINT (+ STT_API_KEY + STT_MODEL) accordingly.
 * Speaker diarization beyond "Speaker 1" requires a diarization-capable backend —
 * swap the provider to upgrade.
 */
@Injectable()
export class WhisperProvider implements ISTTProvider {
  private readonly logger = new Logger('Whisper');

  async transcribe(audio: Buffer, filename: string, mimeType: string): Promise<TranscriptResult> {
    const name = /\.\w+$/.test(filename) ? filename : `${filename}${EXTENSIONS[mimeType] ?? '.mp3'}`;

    const form = new FormData();
    form.append('file', new Blob([audio], { type: mimeType }), name);
    form.append('model', env.STT_MODEL);
    form.append('response_format', 'verbose_json');

    const headers: Record<string, string> = {};
    if (env.STT_API_KEY) headers.Authorization = `Bearer ${env.STT_API_KEY}`;

    const response = await fetch(`${env.STT_ENDPOINT}/v1/audio/transcriptions`, {
      method: 'POST',
      headers,
      body: form,
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Whisper transcription failed (${response.status}): ${detail.slice(0, 300)}`);
    }

    const data = (await response.json()) as {
      language?: string;
      duration?: number;
      segments?: WhisperVerboseSegment[];
      text?: string;
    };

    let segments: SttSegment[] = (data.segments ?? []).map((segment) => ({
      startTimeMs: Math.round(segment.start * 1000),
      endTimeMs: Math.round(segment.end * 1000),
      text: segment.text.trim(),
      speakerLabel: 'Speaker 1',
    }));

    // Some backends omit `segments` — fall back to one segment spanning the audio.
    if (segments.length === 0 && data.text && data.text.trim().length > 0) {
      segments = [
        {
          startTimeMs: 0,
          endTimeMs: Math.round((data.duration ?? 0) * 1000),
          text: data.text.trim(),
          speakerLabel: 'Speaker 1',
        },
      ];
    }

    this.logger.log(`Transcribed ${segments.length} segments (${env.STT_MODEL})`);

    return {
      segments,
      language: data.language ?? 'en',
      durationSeconds: Math.round(data.duration ?? 0),
    };
  }
}
