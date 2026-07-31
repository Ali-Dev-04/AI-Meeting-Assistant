# Product Requirements Document (PRD)
## AI Meeting Assistant

| Field     | Value                          |
|-----------|--------------------------------|
| Version   | 1.0                            |
| Status    | Phase 1 — Draft, pending approval |
| Date      | 2026-07-21                     |
| Owner     | Engineering / Product          |
| Phase     | 1 of 18 — Business Understanding |

---

## 1. Executive Summary

**AI Meeting Assistant** is a B2B SaaS product that turns meeting recordings into searchable, actionable knowledge. Users upload (and later, auto-capture) meeting audio/video; the system transcribes it, generates an AI summary, extracts action items and decisions, and lets the team *ask questions* of their meetings through semantic search and chat.

We are building a learning-oriented, production-grade clone of the **Fireflies.ai / Otter.ai** category, delivered as a **freemium SaaS** for **knowledge-worker teams**.

**Phase-1 capture strategy:** file/audio upload first (MVP), with a real-time meeting-bot integration added in a later release. This sequencing lets us learn the complete AI pipeline early while deferring the hardest platform-integration work.

---

## 2. Product Vision & Mission

> **Vision:** Every team's meeting knowledge, captured, understood, and one question away.
>
> **Mission:** Eliminate the "what did we decide?" problem by making every meeting automatically transcribed, summarized, searchable, and shareable — without anyone taking notes.

**Why now (market context):** Meeting volume per knowledge worker has grown steadily, and built-in tools (Microsoft Copilot, Google Gemini in Meet) are commoditizing *basic* transcription. The durable opportunity for an independent product is **cross-meeting intelligence** — semantic search, action-item tracking, and a chat layer over *all* of a team's meetings, not just the last one.

---

## 3. Business Goals & Success Metrics (OKRs)

We use the OKR (Objectives & Key Results) format because it ties aspirational goals to measurable outcomes. Each KR is something we can instrument.

**Objective 1 — Validate product-market fit with B2B teams**
- KR1: 1,000 free-tier signups within 3 months of launch.
- KR2: 5% free → paid conversion rate.
- KR3: 30% Weekly Active Users / Monthly Active Users (stickiness).

**Objective 2 — Deliver reliable, useful AI value**
- KR1: Transcription word-error-rate (WER) ≤ 10% on clear English audio.
- KR2: Summary usefulness rating ≥ 4.0 / 5 from users.
- KR3: p95 "upload complete → summary ready" latency < 5 minutes.

**Objective 3 — Build a scalable, secure, trustworthy foundation**
- KR1: 99.5% monthly uptime (SLA target for v1).
- KR2: Pass an OWASP ASVS Level 1 security baseline before launch.
- KR3: p95 API response latency < 300 ms (excluding AI jobs).

---

## 4. Target Users & Personas

**Primary segment:** Knowledge-worker teams in small-to-mid companies (5–500 employees) — engineering, product, sales, consulting, design.

> **Note on focus:** We deliberately target B2B *teams* over individual consumers. Team features (workspaces, sharing, roles) are the core differentiator and the source of retention. Serving everyone would dilute the design.

### Personas

**P1 — Priya, Engineering Manager**
- Runs many 1:1s, standups, and design reviews.
- Pain: Forgets decisions made weeks ago; action items slip.
- Needs: Action-item extraction, decision log, search.

**P2 — Marcus, Sales Lead**
- Spends hours on client calls.
- Pain: Manually writing recaps; commitments get lost.
- Needs: Shareable summaries, commitment tracking, CRM-friendly export (later).

**P3 — Dana, Product Manager**
- Synthesizes feedback across many meetings.
- Pain: "What did we decide about feature X, and when?"
- Needs: Semantic search across all meetings, topic grouping.

**P4 — Sam, Team Ops / Admin**
- Manages workspace, seats, and access.
- Pain: Controlling who sees sensitive meeting content.
- Needs: Roles/permissions, admin console, billing.

---

## 5. Market & Competitor Analysis

| Competitor | Strengths | Weaknesses | Our angle |
|------------|-----------|-----------|-----------|
| **Fireflies.ai** | Bot-join, deep integrations, strong B2B | UI clutter, expensive at scale | Cleaner UX, transparent pricing, self-host option (future) |
| **Otter.ai** | Real-time transcription, OtterPilot chat | US-centric, limited team features on lower tiers | Cross-meeting search as a first-class feature |
| **Read.ai** | Meeting analytics & coaching | Analytics-heavy, can feel intrusive | Focus on actionable output (tasks/decisions) |
| **Fathom** | Free, fast summaries | Narrower integration surface | Broader AI (search + chat) on free tier |
| **tl;dv** | Recording + clipping, multi-platform | Less "intelligence" depth | Decision/action extraction emphasis |
| **MS Copilot / Google Gemini** | Free, built into Zoom/Meet/Teams | Siloed per-call, weak cross-meeting search | Vendor-neutral, cross-meeting intelligence |

**Positioning statement:**
> For knowledge-worker teams who run too many meetings, AI Meeting Assistant is a vendor-neutral meeting-intelligence platform that turns every meeting into searchable, actionable knowledge — unlike built-in tools that only help with the current call.

---

## 6. Scope

### 6.1 In Scope — MVP (v1)
- Account registration, login, email verification.
- Team workspaces with member roles (Owner, Admin, Member).
- Meeting upload (audio/video files, up to defined size/duration limits).
- Automated transcription (speech-to-text).
- AI summary, action items, decisions, and topic outline.
- Full-text + semantic search across a workspace's meetings.
- "Ask this meeting" chat (Q&A over a single meeting).
- Meeting sharing (link, role-scoped).
- Freemium plans, usage quotas, and upgrade flow.

### 6.2 Out of Scope — MVP (Roadmap)
- Real-time meeting bot (Zoom / Google Meet / Teams) — *Phase: later.*
- Calendar auto-scheduling of recordings.
- CRM integrations (Salesforce, HubSpot) and Slack/Teams notifications.
- Speaker identification by name (diarization v2), video highlights/clips.
- SOC 2 / HIPAA compliance, SSO (SAML), data residency options.
- Mobile native apps (responsive web first).

> **Why split MVP vs. roadmap now:** A PRD that lists everything as "v1" produces a project that ships nothing. The MVP is the smallest set that lets a real team get value and lets us learn. The roadmap items are designed *for* in the architecture but not built yet.

### 6.3 Prioritization method
Features are prioritized with **MoSCoW** (Must / Should / Could / Won't) in §9.
*Alternatives considered:* **RICE** (Reach × Impact × Confidence ÷ Effort) — better for cross-team portfolio ranking but heavier; **Kano** — great for delight-vs-table-stakes analysis but less actionable for a first build. We adopt MoSCoW for clarity and use RICE informally when comparing roadmap items later.

---

## 7. Functional Requirements

Each requirement has a stable ID (`FR-<domain>-<nn>`) so later phases (API, tests, schema) can trace back to it.

### A. Authentication & Account
- **FR-A01** Register with email + password.
- **FR-A02** Login with email + password; issue access + refresh tokens.
- **FR-A03** Email verification and password reset.
- **FR-A04** Update profile and change password.
- **FR-A05** OAuth social login (Google) — *Should.*

### B. Workspace & Team
- **FR-B01** Create a workspace; creator becomes Owner.
- **FR-B02** Invite members by email; accept/reject flow.
- **FR-B03** Roles: Owner, Admin, Member with defined permissions.
- **FR-B04** Remove members; reassign ownership.

### C. Meeting Ingestion
- **FR-C01** Upload audio/video file (MVP).
- **FR-C02** Enforce file-type, size, and duration limits per plan.
- **FR-C03** Show upload progress and processing status (queued → transcribing → summarizing → ready).
- **FR-C04** (Roadmap) Real-time bot capture via conferencing APIs.

### D. Transcription
- **FR-D01** Automatic speech-to-text on upload.
- **FR-D02** Speaker diarization (Speaker 1, Speaker 2 … in v1; names in v2).
- **FR-D03** Timestamped, searchable transcript view synced to audio.
- **FR-D04** Editable transcript (user corrections).

### E. AI Processing
- **FR-E01** Generate a structured summary (overview + key points).
- **FR-E02** Extract action items (task, owner, due-if-mentioned).
- **FR-E03** Detect and list decisions.
- **FR-E04** Generate a topic/chapter outline.
- **FR-E05** Allow user to regenerate or refine AI output.

### F. Search
- **FR-F01** Full-text search across transcript + summary.
- **FR-F02** Semantic search ("meetings where we discussed pricing").
- **FR-F03** Filter by date, participant, workspace.
- **FR-F04** Return ranked results with context snippets and source links.

### G. Meeting Chat ("Ask this meeting")
- **FR-G01** Ask free-form questions answered from the transcript.
- **FR-G02** Answers cite the source transcript segments.
- **FR-G03** (Roadmap) "Ask across all meetings" mode.

### H. Collaboration
- **FR-H01** Share a meeting via link with role-scoped access.
- **FR-H02** Comments and highlights on transcript segments.
- **FR-H03** Export summary / action items (PDF, Markdown, copy).

### I. Notifications
- **FR-I01** Email notification when a meeting is ready.
- **FR-I02** In-app notifications (processing done, shared with you).

### J. Billing & Plans (Freemium)
- **FR-J01** Plans: **Free**, **Pro**, **Business** — with quota table (see §11).
- **FR-J02** Track usage (minutes transcribed, meetings/month, seats).
- **FR-J03** Upgrade/downgrade and Stripe checkout.
- **FR-J04** Enforce quotas at ingestion time with clear messaging.

### K. Admin & Settings
- **FR-K01** Workspace settings (name, default sharing).
- **FR-K02** Member management console.
- **FR-K03** Usage dashboard per workspace.

---

## 8. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | p95 API latency < 300 ms; upload→summary p95 < 5 min; UI first-contentful-paint < 1.5 s. |
| **Scalability** | Support 10k users / 1k concurrent in v1; horizontally scalable stateless API; async job workers scale independently. |
| **Availability** | 99.5% monthly uptime (v1); graceful degradation (UI works if AI jobs are delayed). |
| **Security** | TLS in transit; AES-256 at rest; OWASP ASVS L1; per-tenant data isolation; secrets in a vault, never in code. |
| **Privacy / Consent** | Recording-consent indicator; one-click data export & deletion (GDPR/CCPA-friendly); data retention controls. |
| **Compliance (roadmap)** | SOC 2 Type I, optional SSO/SAML, data-residency regions. |
| **Reliability** | Retries with backoff for AI/transcription jobs; idempotent uploads; dead-letter queue for failed jobs. |
| **Observability** | Structured logs, metrics, health checks, error tracking (Sentry-class), request tracing. |
| **Accessibility** | WCAG 2.1 AA; keyboard-navigable; screen-reader-friendly transcript. |
| **Maintainability** | Modular monolith (NestJS modules); >70% unit-test coverage on core logic; typed end-to-end (TypeScript). |
| **Internationalization** | English first; i18n-ready UI; UTC timestamps with local display. |

---

## 9. User Stories (prioritized — MoSCoW)

Format: *As a \<persona\>, I want \<goal\>, so that \<benefit\>.*

| ID | Priority | Story |
|----|----------|-------|
| US-01 | Must | As Priya, I want to upload a meeting recording so it gets transcribed automatically. |
| US-02 | Must | As Priya, I want an AI summary so I can grasp a meeting in 30 seconds. |
| US-03 | Must | As Priya, I want action items extracted so nothing falls through the cracks. |
| US-04 | Must | As Dana, I want to search across all meetings so I can find past decisions. |
| US-05 | Must | As Dana, I want semantic search so I find meetings by meaning, not just keywords. |
| US-06 | Must | As Marcus, I want to share a meeting via link so my team can read the recap. |
| US-07 | Must | As Sam, I want to create a workspace and invite teammates so we share one library. |
| US-08 | Must | As any user, I want to "ask this meeting" questions and get cited answers. |
| US-09 | Must | As Sam, I want role-based access so only authorized people see sensitive meetings. |
| US-10 | Should | As Priya, I want decisions extracted into a decision log. |
| US-11 | Should | As Dana, I want a topic outline so I can skim long meetings. |
| US-12 | Should | As any user, I want to comment/highlight transcript segments. |
| US-13 | Should | As any user, I want to export summaries (PDF/Markdown). |
| US-14 | Could | As Priya, I want to edit the transcript to correct errors. |
| US-15 | Won't (v1) | As Marcus, I want the bot to join my Zoom call live. |

---

## 10. Acceptance Criteria (Given / When / Then)

Flagship stories only; full AC generated per story during development.

**AC for US-01 (Upload + Transcribe)**
- **Given** a logged-in Pro user under their quota, **when** they upload a valid MP3 (≤ plan limit), **then** the file is stored, status becomes "Processing," and a transcript appears within p95 5 min.
- **Given** the user is over quota, **when** they attempt upload, **then** they see a clear quota message and an upgrade prompt, and no upload occurs.

**AC for US-02 (AI Summary)**
- **Given** a transcript exists, **when** processing completes, **then** a structured summary (overview + ≥3 key points) is displayed, is editable, and can be regenerated.

**AC for US-05 (Semantic Search)**
- **Given** multiple processed meetings, **when** Dana searches "pricing objections," **then** results are ranked by semantic relevance, each with a source snippet and link, and keyword-only matches are not required.

**AC for US-08 (Ask this meeting)**
- **Given** a processed meeting, **when** a user asks "what did we decide?", **then** the answer is grounded in the transcript and cites the specific segment(s); if not found, it says so rather than inventing.

**AC for US-07/US-09 (Workspace + Roles)**
- **Given** a Member role, **when** they attempt to delete another user's meeting, **then** the action is denied with a 403 and an audit-appropriate message.

---

## 11. Freemium Plan Table (quota design)

| Feature | Free | Pro | Business |
|---------|------|-----|----------|
| Meetings / month | 5 | 50 | Unlimited (fair-use) |
| Transcription minutes / month | 300 | 2,000 | 10,000 |
| AI summary + action items | ✓ | ✓ | ✓ |
| Semantic search | Limited | ✓ | ✓ |
| Meeting chat | 3/day | Unlimited | Unlimited |
| Workspace seats | 1 | 3 | 20+ |
| Sharing & export | — | ✓ | ✓ |
| Roles & admin console | — | — | ✓ |

> Quotas are *enforced, not just displayed* — this is why billing appears as a functional requirement (FR-J) and will surface in the database schema (usage counters) and API (middleware checks).

---

## 12. Risks, Assumptions, Constraints

**Risks**
- **Consent / legality:** Recording meetings may require participant consent (varies by jurisdiction). *Mitigation:* consent indicator, clear ToS, recording notice.
- **AI cost:** STT + LLM costs scale with usage and can erode margin. *Mitigation:* quotas, caching embeddings/summaries, model tiering, async batching.
- **Accuracy:** Diarization, accents, noisy audio degrade quality. *Mitigation:* editable transcripts, quality warnings, model selection.
- **Platform dependency:** Future bot integrations depend on third-party APIs. *Mitigation:* the upload path remains a permanent fallback (a direct benefit of the Hybrid decision).

**Assumptions**
- Users have recordings to upload (or will, once the bot ships).
- English is the primary language for v1 accuracy targets.
- A third-party STT provider (e.g., Whisper-compatible) and an LLM (Claude) are acceptable dependencies.

**Constraints**
- Self-hosted-friendly architecture (no hard cloud lock-in beyond storage/queue).
- Build must teach each engineering discipline end-to-end (per project goals).

---

## 13. Glossary

- **STT** — Speech-to-Text (transcription).
- **Diarization** — separating "who spoke when."
- **WER** — Word Error Rate, transcription accuracy metric.
- **Semantic search** — search by meaning using vector embeddings.
- **Embedding** — a numeric vector representing text meaning.
- **p95** — 95th-percentile latency (95% of requests are faster).
- **MoSCoW** — Must / Should / Could / Won't prioritization.
- **DAG / DLQ** — Directed Acyclic Graph (job pipeline) / Dead-Letter Queue (failed jobs).
- **RAG** — Retrieval-Augmented Generation (grounding LLM answers in source data).

---

## 14. Open Questions (for review before Phase 2)

1. Confirm MVP scope in §6.1 — anything missing or to drop?
2. Plan table in §11 — are the quotas/pricing realistic for your context?
3. STT provider preference for v1: self-hosted Whisper vs. managed API? (affects cost & Phase-3 tech selection).
4. Primary deployment region / any data-residency constraint?

---

*End of Phase 1 deliverable. Approval required before Phase 2 (System Design).*
