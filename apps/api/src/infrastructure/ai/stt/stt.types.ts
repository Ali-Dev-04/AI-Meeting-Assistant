export interface SttSegment {
  startTimeMs: number;
  endTimeMs: number;
  text: string;
  speakerLabel: string;
}

export interface TranscriptResult {
  segments: SttSegment[];
  language: string;
  durationSeconds: number;
}

/** Provider-agnostic speech-to-text contract. */
export interface ISTTProvider {
  transcribe(audio: Buffer, filename: string, mimeType: string): Promise<TranscriptResult>;
}

export const STT_PROVIDER = Symbol('STT_PROVIDER');
