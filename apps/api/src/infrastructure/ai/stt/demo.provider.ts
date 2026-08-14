import { Injectable } from '@nestjs/common';
import { ISTTProvider, TranscriptResult } from './stt.types';

/**
 * DEMO speech-to-text — no model, no service. Produces one of a few scripted,
 * multi-speaker transcripts (rotated by file size) so the processing pipeline can
 * run end-to-end locally: upload → "transcribe" → summarize (LLM) → index. The
 * scripts are deliberately rich in action items and decisions so downstream LLM
 * extraction has real material to work with.
 *
 * For real transcription set STT_PROVIDER=whisper (+ STT_ENDPOINT).
 */
const SCRIPTS: Array<{ language: string; segments: TranscriptResult['segments'] }> = [
  {
    language: 'en',
    segments: [
      { startTimeMs: 0, endTimeMs: 7000, speakerLabel: 'Speaker 1', text: "Alright, let's get started. The main topic today is the Q3 roadmap and where we're spending engineering time." },
      { startTimeMs: 7000, endTimeMs: 16000, speakerLabel: 'Speaker 2', text: 'Thanks. My biggest concern is onboarding — activation dropped eight percent last month and support tickets are up.' },
      { startTimeMs: 16000, endTimeMs: 26000, speakerLabel: 'Speaker 3', text: 'I pulled the numbers. Most drop-off happens on the invite step. I think we should simplify it to a single screen.' },
      { startTimeMs: 26000, endTimeMs: 35000, speakerLabel: 'Speaker 1', text: 'Agreed. Priya, can you prototype the single-screen invite flow by next Wednesday?' },
      { startTimeMs: 35000, endTimeMs: 45000, speakerLabel: 'Speaker 2', text: 'On the API side, we need to ship the pagination fixes before the enterprise demo on the twelfth.' },
      { startTimeMs: 45000, endTimeMs: 54000, speakerLabel: 'Speaker 3', text: 'I can take that, but I will need the staging environment refreshed first.' },
      { startTimeMs: 54000, endTimeMs: 63000, speakerLabel: 'Speaker 1', text: 'Marcus will handle staging today. Decision made: onboarding redesign is our top priority for Q3.' },
      { startTimeMs: 63000, endTimeMs: 72000, speakerLabel: 'Speaker 2', text: 'Last item — the pricing page copy. Marketing needs final tiers by Friday or the launch slips a week.' },
      { startTimeMs: 72000, endTimeMs: 80000, speakerLabel: 'Speaker 1', text: "Let's not slip. I'll send the tier definitions to marketing tomorrow morning. Thanks, everyone." },
    ],
  },
  {
    language: 'en',
    segments: [
      { startTimeMs: 0, endTimeMs: 8000, speakerLabel: 'Speaker 1', text: 'This is the weekly customer feedback review. We had twelve interviews this week — I want to focus on the three biggest themes.' },
      { startTimeMs: 8000, endTimeMs: 18000, speakerLabel: 'Speaker 2', text: 'Theme one is reporting. Almost every enterprise buyer asked for scheduled exports, not just dashboards.' },
      { startTimeMs: 18000, endTimeMs: 28000, speakerLabel: 'Speaker 3', text: 'Theme two is reliability. Two customers mentioned slow loads on Friday afternoons — probably our batch job window.' },
      { startTimeMs: 28000, endTimeMs: 38000, speakerLabel: 'Speaker 1', text: 'We should move the batch jobs to off-hours. Dana, can you own that investigation?' },
      { startTimeMs: 38000, endTimeMs: 48000, speakerLabel: 'Speaker 2', text: 'Theme three is integrations. Customers keep asking for Slack notifications when reports are ready.' },
      { startTimeMs: 48000, endTimeMs: 58000, speakerLabel: 'Speaker 3', text: 'Slack is a two-week build if we reuse the webhook framework. I would scope it after the exports work.' },
      { startTimeMs: 58000, endTimeMs: 68000, speakerLabel: 'Speaker 1', text: 'Decision: scheduled exports ship first, Slack notifications go on the Q4 list. Marcus will write the spec.' },
      { startTimeMs: 68000, endTimeMs: 76000, speakerLabel: 'Speaker 2', text: 'I will also send a summary of the interview notes to the whole team this week.' },
    ],
  },
  {
    language: 'en',
    segments: [
      { startTimeMs: 0, endTimeMs: 9000, speakerLabel: 'Speaker 1', text: "Let's do sprint planning and the hiring update. We have two backend roles open and a growing backlog." },
      { startTimeMs: 9000, endTimeMs: 19000, speakerLabel: 'Speaker 2', text: 'Backlog top three: the search relevance fix, the mobile layout bugs, and the billing webhook retries.' },
      { startTimeMs: 19000, endTimeMs: 29000, speakerLabel: 'Speaker 3', text: 'Search relevance is almost done — I just need a review. The mobile bugs are quick, maybe a day each.' },
      { startTimeMs: 29000, endTimeMs: 39000, speakerLabel: 'Speaker 1', text: "Good. Let's freeze deploys on Thursday while the billing migration runs. Decision: freeze Thursday, migrate Friday morning." },
      { startTimeMs: 39000, endTimeMs: 49000, speakerLabel: 'Speaker 2', text: 'On hiring, we have four backend candidates to screen this week. I will schedule the panels.' },
      { startTimeMs: 49000, endTimeMs: 58000, speakerLabel: 'Speaker 3', text: 'I can do the technical screens on Tuesday and Wednesday afternoons.' },
      { startTimeMs: 58000, endTimeMs: 68000, speakerLabel: 'Speaker 1', text: 'Perfect. Priya takes search relevance and the mobile fixes; Marcus owns screens and the migration runbook.' },
      { startTimeMs: 68000, endTimeMs: 76000, speakerLabel: 'Speaker 2', text: "I'll publish the runbook to the wiki by end of day tomorrow. That's everything from me." },
    ],
  },
];

@Injectable()
export class DemoSttProvider implements ISTTProvider {
  async transcribe(audio: Buffer): Promise<TranscriptResult> {
    // Rotate scripts by file size so consecutive demo uploads differ slightly.
    const script = SCRIPTS[audio.length % SCRIPTS.length]!;
    const durationSeconds = Math.ceil(
      (script.segments[script.segments.length - 1]?.endTimeMs ?? 0) / 1000,
    );
    return { segments: script.segments, language: script.language, durationSeconds };
  }
}
