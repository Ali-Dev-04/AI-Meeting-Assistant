import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { embedTextsLocally } from '../src/infrastructure/ai/embeddings/local-embeddings';

/**
 * Development demo seed. Idempotent: upserts the workspace + users, then WIPES the
 * workspace's meetings (cascading to all children) and recreates a curated demo set
 * — 5 fully-processed meetings + 1 "Queued" one — with transcripts, summaries,
 * action items (assigned, with due dates + varied statuses), decisions, and a few
 * comments/highlights.
 *
 * Login: owner@acme.test / admin@acme.test / member@acme.test · password: password123
 * Run: pnpm --filter @ama/api prisma db seed
 */
const prisma = new PrismaClient();
const DAY = 86_400_000;

interface User {
  id: string;
}
interface SegSpec {
  speaker: string;
  start: number;
  end: number;
  text: string;
}
interface ActionSpec {
  text: string;
  assignee: User;
  /** Days from now until due. Negative = overdue. Undefined = no due date. */
  dueOffsetDays?: number;
  status?: 'OPEN' | 'DONE' | 'DISMISSED';
}
interface CommentSpec {
  body: string;
  author: User;
  type?: 'COMMENT' | 'HIGHLIGHT';
  segIndex?: number;
}
interface MeetingSpec {
  id: string;
  title: string;
  occurredDaysAgo: number;
  durationSeconds: number;
  status: 'READY' | 'QUEUED';
  ownerId: string;
  overview: string;
  keyPoints: string[];
  segments: SegSpec[];
  actions: ActionSpec[];
  decisions: { text: string; context?: string }[];
  comments?: CommentSpec[];
  topics?: Array<{ label: string; summary?: string; startTimeMs: number }>;
}

async function main() {
  const passwordHash = await bcrypt.hash('password123', 12);

  const owner = await prisma.user.upsert({
    where: { email: 'owner@acme.test' },
    update: {},
    create: { email: 'owner@acme.test', name: 'Dana (Owner)', passwordHash, emailVerifiedAt: new Date() },
  });
  const admin = await prisma.user.upsert({
    where: { email: 'admin@acme.test' },
    update: {},
    create: { email: 'admin@acme.test', name: 'Marcus (Admin)', passwordHash, emailVerifiedAt: new Date() },
  });
  const member = await prisma.user.upsert({
    where: { email: 'member@acme.test' },
    update: {},
    create: { email: 'member@acme.test', name: 'Priya (Member)', passwordHash, emailVerifiedAt: new Date() },
  });

  const workspace = await prisma.workspace.upsert({
    where: { slug: 'acme-inc' },
    update: {},
    create: { name: 'Acme Inc', slug: 'acme-inc', ownerId: owner.id, plan: 'BUSINESS' },
  });

  for (const [user, role] of [
    [owner, 'OWNER'],
    [admin, 'ADMIN'],
    [member, 'MEMBER'],
  ] as const) {
    await prisma.workspaceMember.upsert({
      where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } },
      update: {},
      create: { userId: user.id, workspaceId: workspace.id, role, status: 'ACTIVE' },
    });
  }

  // Reset demo meetings (cascades to transcript/summary/action items/decisions/comments/share links).
  await prisma.meeting.deleteMany({ where: { workspaceId: workspace.id } });

  const specs: MeetingSpec[] = [
    {
      id: 'a1a1a1a1-0001-4000-8000-000000000001',
      title: 'Q3 Planning Sync',
      occurredDaysAgo: 2,
      durationSeconds: 3720,
      status: 'READY',
      ownerId: owner.id,
      overview:
        'The team aligned on shifting to usage-based pricing for Q3, targeting an August 15 launch. Scope for the v1 release is frozen to avoid slippage.',
      keyPoints: ['Shift to usage-based pricing', 'Launch by August 15', 'Freeze scope for the v1 release'],
      segments: [
        { speaker: 'Dana', start: 0, end: 5000, text: "Let's decide on the pricing model for Q3." },
        { speaker: 'Marcus', start: 5000, end: 12000, text: 'Usage-based pricing makes the most sense for enterprise customers.' },
        { speaker: 'Priya', start: 12000, end: 19000, text: 'Customers keep asking for predictable tiers though — can we offer both?' },
        { speaker: 'Dana', start: 19000, end: 26000, text: "Good point. Marcus drafts the tiers, Priya validates with three accounts, and we launch by August 15." },
      ],
      actions: [
        { text: 'Draft the usage-based pricing tiers', assignee: admin, dueOffsetDays: 5, status: 'OPEN' },
        { text: 'Update the product roadmap', assignee: owner, dueOffsetDays: -3, status: 'OPEN' },
        { text: 'Validate pricing with three design partners', assignee: member, dueOffsetDays: 2, status: 'DONE' },
        { text: 'Schedule pricing review with leadership', assignee: owner, status: 'OPEN' },
      ],
      decisions: [{ text: 'Freeze scope for the v1 release.', context: 'Avoid scope creep before launch.' }],
      comments: [
        { body: 'This is the key decision — lets make sure leadership signs off.', author: member, type: 'HIGHLIGHT', segIndex: 3 },
        { body: 'I will share a draft by Thursday.', author: admin, segIndex: 1 },
      ],
      topics: [
        { label: 'Pricing model', summary: 'Choosing between usage-based and predictable tiers.', startTimeMs: 0 },
        { label: 'Customer validation', startTimeMs: 12000 },
        { label: 'Launch plan', summary: 'Tier drafting, validation, and the Aug 15 target.', startTimeMs: 19000 },
      ],
    },
    {
      id: 'a1a1a1a1-0002-4000-8000-000000000002',
      title: 'Customer Discovery — Acme Corp',
      occurredDaysAgo: 5,
      durationSeconds: 2880,
      status: 'READY',
      ownerId: member.id,
      overview:
        'Interview with Acme Corp surfaced onboarding churn and strong demand for SSO and analytics. They are willing to pay a premium for both.',
      keyPoints: ['Onboarding churn is the top pain', 'SSO is a blocker for enterprise deals', 'Analytics is a high-value add-on'],
      segments: [
        { speaker: 'Priya', start: 0, end: 6000, text: 'Thanks for the time. Where does the current tooling fall short?' },
        { speaker: 'Customer', start: 6000, end: 16000, text: 'Onboarding is rough — half my team gave up. And we cannot roll it out without SSO.' },
        { speaker: 'Customer', start: 16000, end: 24000, text: 'If you had analytics on meeting trends, leadership would pay for that tomorrow.' },
      ],
      actions: [
        { text: 'Send Acme the SSO one-pager', assignee: member, dueOffsetDays: 1, status: 'OPEN' },
        { text: 'Loop in solutions engineering on SSO feasibility', assignee: admin, dueOffsetDays: 3, status: 'OPEN' },
        { text: 'Add analytics to the Q3 roadmap', assignee: owner, dueOffsetDays: 7, status: 'OPEN' },
      ],
      decisions: [{ text: 'Prioritize SSO for the next release.', context: 'Blocking multiple enterprise deals.' }],
      comments: [{ body: 'The SSO quote at 0:06 is gold for the roadmap pitch.', author: owner, type: 'HIGHLIGHT', segIndex: 1 }],
      topics: [
        { label: 'Pain points', summary: 'Onboarding churn and support load.', startTimeMs: 0 },
        { label: 'SSO demand', startTimeMs: 6000 },
        { label: 'Analytics ask', startTimeMs: 16000 },
      ],
    },
    {
      id: 'a1a1a1a1-0003-4000-8000-000000000003',
      title: 'Engineering Weekly',
      occurredDaysAgo: 1,
      durationSeconds: 2100,
      status: 'READY',
      ownerId: admin.id,
      overview:
        'Standup covered the Postgres migration (80% done), the SEV-2 incident postmortem, and open hiring for two backend roles.',
      keyPoints: ['DB migration 80% complete', 'Incident postmortem due Friday', 'Two backend roles open'],
      segments: [
        { speaker: 'Marcus', start: 0, end: 7000, text: 'Migration is 80% done — cutover is on track for next week.' },
        { speaker: 'Priya', start: 7000, end: 14000, text: 'I am still writing the SEV-2 postmortem; need the timeline from on-call.' },
        { speaker: 'Dana', start: 14000, end: 20000, text: 'Lets freeze deploys Friday and screen the backend candidates next week.' },
      ],
      actions: [
        { text: 'Finish the Postgres migration cutover', assignee: admin, dueOffsetDays: 4, status: 'OPEN' },
        { text: 'Write the SEV-2 incident postmortem', assignee: member, dueOffsetDays: -1, status: 'OPEN' },
        { text: 'Screen three backend candidates', assignee: owner, status: 'OPEN' },
      ],
      decisions: [{ text: 'Freeze deploys on Friday.', context: 'Protect the migration cutover window.' }],
      comments: [],
      topics: [
        { label: 'DB migration', startTimeMs: 0 },
        { label: 'Incident postmortem', startTimeMs: 7000 },
        { label: 'Hiring', startTimeMs: 14000 },
      ],
    },
    {
      id: 'a1a1a1a1-0004-4000-8000-000000000004',
      title: 'Pricing Committee',
      occurredDaysAgo: 12,
      durationSeconds: 1500,
      status: 'READY',
      ownerId: owner.id,
      overview:
        'Defined three pricing tiers: Free (up to 1,000 meeting minutes), Pro, and custom Enterprise. Legal review pending on enterprise terms.',
      keyPoints: ['Three tiers: Free, Pro, Enterprise', 'Free capped at 1,000 minutes', 'Enterprise is custom-quote'],
      segments: [
        { speaker: 'Dana', start: 0, end: 6000, text: 'Proposing three tiers: Free, Pro, and Enterprise.' },
        { speaker: 'Marcus', start: 6000, end: 13000, text: 'Free should cap at a thousand minutes so it does not cannibalize Pro.' },
        { speaker: 'Priya', start: 13000, end: 19000, text: 'Enterprise needs custom terms — legal has to review before we publish.' },
      ],
      actions: [
        { text: 'Finalize tier names', assignee: admin, dueOffsetDays: -5, status: 'DONE' },
        { text: 'Get legal review of enterprise terms', assignee: owner, dueOffsetDays: 10, status: 'OPEN' },
        { text: 'Draft pricing page copy', assignee: member, dueOffsetDays: 6, status: 'DISMISSED' },
      ],
      decisions: [{ text: 'Ship three pricing tiers.', context: 'Aligns with the usage-based model.' }],
      comments: [],
      topics: [
        { label: 'Tier structure', startTimeMs: 0 },
        { label: 'Enterprise terms', summary: 'Custom terms pending legal review.', startTimeMs: 13000 },
      ],
    },
    {
      id: 'a1a1a1a1-0005-4000-8000-000000000005',
      title: 'All-Hands — July',
      occurredDaysAgo: 18,
      durationSeconds: 2400,
      status: 'READY',
      ownerId: owner.id,
      overview:
        'Company update: ARR up 18% QoQ, two new hires starting, and NPS climbed to 52. Focus remains on the Q3 launch.',
      keyPoints: ['ARR up 18% quarter over quarter', 'Two new hires onboard', 'NPS reached 52'],
      segments: [
        { speaker: 'Dana', start: 0, end: 8000, text: 'Great progress — ARR is up 18 percent versus last quarter.' },
        { speaker: 'Priya', start: 8000, end: 15000, text: 'NPS climbed to 52, mostly driven by the faster onboarding.' },
        { speaker: 'Dana', start: 15000, end: 21000, text: 'Two new hires start Monday. Lets keep the momentum into the Q3 launch.' },
      ],
      actions: [{ text: 'Share the OKR deck with the company', assignee: owner, dueOffsetDays: 2, status: 'OPEN' }],
      decisions: [],
      comments: [{ body: 'NPS milestone worth celebrating in the next note.', author: member, segIndex: 1 }],
      topics: [
        { label: 'Company update', summary: 'ARR, hiring, and NPS highlights.', startTimeMs: 0 },
        { label: 'NPS & onboarding', startTimeMs: 8000 },
      ],
    },
    {
      id: 'a1a1a1a1-0006-4000-8000-000000000006',
      title: 'Sales Call — Globex (uploaded)',
      occurredDaysAgo: 0,
      durationSeconds: 1800,
      status: 'QUEUED',
      ownerId: member.id,
      overview: '',
      keyPoints: [],
      segments: [],
      actions: [],
      decisions: [],
      comments: [],
    },
  ];

  for (const spec of specs) {
    await prisma.meeting.create({
      data: {
        id: spec.id,
        workspaceId: workspace.id,
        title: spec.title,
        ownerId: spec.ownerId,
        sourceType: 'UPLOAD',
        status: spec.status,
        durationSeconds: spec.durationSeconds,
        occurredAt: new Date(Date.now() - spec.occurredDaysAgo * DAY),
      },
    });

    // QUEUED meetings have no transcript/summary yet (still "processing").
    if (spec.status !== 'READY') continue;

    const transcript = await prisma.transcript.create({ data: { meetingId: spec.id, language: 'en' } });
    const segmentIds: string[] = [];
    for (const [i, s] of spec.segments.entries()) {
      const seg = await prisma.transcriptSegment.create({
        data: {
          transcriptId: transcript.id,
          index: i,
          speakerLabel: s.speaker,
          startTimeMs: s.start,
          endTimeMs: s.end,
          text: s.text,
        },
      });
      segmentIds.push(seg.id);
    }

    await prisma.summary.create({
      data: {
        meetingId: spec.id,
        overview: spec.overview,
        keyPoints: spec.keyPoints,
        model: 'seed',
        promptVersion: '1',
      },
    });

    await prisma.actionItem.createMany({
      data: spec.actions.map((a) => ({
        meetingId: spec.id,
        text: a.text,
        assigneeUserId: a.assignee.id,
        dueDate: a.dueOffsetDays != null ? new Date(Date.now() + a.dueOffsetDays * DAY) : null,
        status: a.status ?? 'OPEN',
      })),
    });

    for (const d of spec.decisions) {
      await prisma.decision.create({ data: { meetingId: spec.id, text: d.text, context: d.context } });
    }

    for (const [i, t] of (spec.topics ?? []).entries()) {
      await prisma.topic.create({
        data: { meetingId: spec.id, label: t.label, summary: t.summary ?? null, startTimeMs: t.startTimeMs, sortOrder: i },
      });
    }

    for (const c of spec.comments ?? []) {
      await prisma.comment.create({
        data: {
          meetingId: spec.id,
          userId: c.author.id,
          body: c.body,
          type: c.type ?? 'COMMENT',
          transcriptSegmentId: c.segIndex != null ? segmentIds[c.segIndex] : null,
        },
      });
    }

    // Index for semantic search + chat RAG: chunk the transcript (same ~230-word
    // packing as the processing pipeline) and store locally-computed vectors.
    const chunks: Array<{ start: number; end: number; text: string; words: number }> = [];
    let current: { start: number; end: number; text: string; words: number } | null = null;
    for (const [i, s] of spec.segments.entries()) {
      const words = s.text.trim().split(/\s+/).length;
      if (!current) {
        current = { start: i, end: i, text: s.text, words };
      } else {
        current.end = i;
        current.text += ' ' + s.text;
        current.words += words;
      }
      if (current.words >= 230) {
        chunks.push(current);
        current = null;
      }
    }
    if (current) chunks.push(current);

    const vectors = embedTextsLocally(chunks.map((c) => c.text), 384);
    for (const [i, chunk] of chunks.entries()) {
      const vector = vectors[i];
      if (!vector) continue;
      // Raw SQL: the `embedding` column is Unsupported("vector") in Prisma. Columns are
      // camelCase (no @map in the schema) so they must be double-quoted in raw SQL.
      await prisma.$executeRaw`
        INSERT INTO embedding_chunks
          (id, "meetingId", "startSegmentIndex", "endSegmentIndex", text, "tokenCount", embedding, "createdAt")
        VALUES
          (gen_random_uuid(), ${spec.id}, ${chunk.start}, ${chunk.end},
           ${chunk.text}, ${Math.round(chunk.words * 1.3)}, ${`[${vector.join(',')}]`}::vector, NOW())
      `;
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    `✅ Seed complete: ${specs.length} meetings (5 ready + 1 queued). ` +
      'Login: owner@acme.test / admin@acme.test / member@acme.test · password123',
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
