# Technology Selection
## AI Meeting Assistant

| Field     | Value                              |
|-----------|------------------------------------|
| Version   | 1.0                                |
| Status    | Phase 3 — Draft, pending approval  |
| Date      | 2026-07-21                         |
| Depends on| PRD.md, architecture.md            |
| Phase     | 3 of 18 — Technology Selection     |

---

## 1. Selection Criteria

Every choice below is scored against the same yardstick:

1. **Fit for purpose** — does it solve the problem well?
2. **Learning value** — does it teach a transferable industry pattern (this is a learning project)?
3. **Type-safety & DX** — end-to-end types catch bugs early and speed us up.
4. **Operational simplicity** — fewer moving parts, easy to run locally (Docker Compose), easy to deploy.
5. **Avoid lock-in** — swappable behind an interface; no hard cloud/proprietary coupling where avoidable.
6. **Maturity & community** — well-documented, actively maintained, hireable.

> **Self-host vs. managed philosophy:** for components that teach core concepts and have predictable cost profiles (STT, embeddings), we **self-host** behind an interface so we can swap to a managed API later. For undifferentiated heavy lifting we'd rather not run ourselves (managed Postgres, Redis, object storage), we use **managed services** in production and local equivalents (MinIO) in dev. This mirrors how pragmatic startups operate: own what differentiates you, rent what doesn't.

---

## 2. The Stack at a Glance

| Layer | Choice | Alternatives considered |
|-------|--------|-------------------------|
| **Monorepo** | pnpm workspaces | Turborepo, Nx, npm/yarn workspaces |
| **Frontend framework** | Next.js (App Router) + React | Remix, Vite SPA, SvelteKit |
| **Language** | TypeScript (strict) | JavaScript, Flow |
| **Styling** | TailwindCSS | CSS Modules, styled-components, vanilla-extract |
| **UI components** | shadcn/ui (Radix + Tailwind) | MUI, Mantine, Chakra, Ant Design |
| **Server state** | TanStack Query (React Query) | SWR, RTK Query, manual fetch |
| **Client state** | Zustand | Redux Toolkit, Jotai, Context |
| **Forms & validation** | React Hook Form + Zod | Formik, Yup, class-validator (BE only) |
| **Backend framework** | NestJS | Express, Fastify, Hono, AdonisJS |
| **Runtime** | Node.js LTS | Bun, Deno |
| **Database** | PostgreSQL | MySQL, SQLite (dev only) |
| **ORM** | Prisma | Drizzle, TypeORM, Kysely |
| **Auth** | JWT (access+refresh) + bcrypt | Sessions, Clerk/Auth0/Supabase Auth |
| **Caching / queue backend** | Redis | Memcached, KeyDB, Dragonfly |
| **Job queue** | BullMQ | RabbitMQ, SQS, Temporal, Kafka |
| **Object storage** | S3 (+ MinIO in dev) | Azure Blob, GCS, local FS |
| **Vector store** | pgvector | Qdrant, Pinecone, Weaviate, Milvus |
| **STT** | Whisper (self-hosted) | Deepgram, AssemblyAI, OpenAI Whisper API |
| **LLM** | Claude (Anthropic) | OpenAI GPT, Llama (Ollama) |
| **Embeddings** | Self-hosted sentence model | OpenAI text-embedding-3, Cohere |
| **API docs** | OpenAPI via nestjs/swagger | Stoplight, Postman |
| **Backend testing** | Jest + Supertest | Vitest, Mocha |
| **Frontend testing** | Vitest + React Testing Library | Jest, Cypress |
| **E2E testing** | Playwright | Cypress, Puppeteer |
| **A11y testing** | axe-core (jest-axe + @axe-core/playwright) | Lighthouse A11y, Pa11y |
| **Perf testing** | k6 + Lighthouse CI | Artillery, JMeter |
| **Security scanning** | OWASP ZAP, npm audit / OSV, ESLint security | Snyk, Trivy, SonarQube |
| **Logging** | pino | winston, bunyan |
| **Metrics** | prom-client + Grafana | Datadog, New Relic |
| **Error tracking** | Sentry | Rollbar, Bugsnag |
| **Tracing** | OpenTelemetry | Jaeger, Honeycomb |
| **Product analytics** | PostHog | Mixpanel, Amplitude, GA |
| **CI/CD** | GitHub Actions | GitLab CI, CircleCI, Jenkins |
| **Code quality** | ESLint, Prettier, TypeScript strict, Husky, commitlint | Biome, StandardJS |
| **Web hosting** | Vercel (Next.js) | Netlify, AWS Amplify |
| **App containers** | Railway/Render (dev-leaning) → AWS ECS Fargate (prod-leaning) | Fly.io, GCP Cloud Run, Kubernetes |

---

## 3. Frontend

### Next.js (App Router) + React + TypeScript
- **Why:** SSR/SSG for fast first paint and SEO on public pages; file-based routing; React Server Components reduce client JS; first-class Vercel deployment; the dominant React meta-framework, so maximum community/hiring.
- **Alternatives:** **Remix** (excellent data-loading, smaller ecosystem), **Vite SPA** (simpler, no SSR — fine for an internal tool but weaker for perf/SEO), **SvelteKit** (great DX but a different ecosystem and fewer AI/TS libraries).
- **Trade-off:** App Router is still evolving; some patterns are nuanced. Acceptable — it's the future of React.

### TailwindCSS
- **Why:** utility-first classes enforce a consistent design system (spacing, color, type scale) without writing bespoke CSS; tiny production bundles via purge; pairs perfectly with shadcn/ui.
- **Alternatives:** **CSS Modules** (scoped but no system), **styled-components/emotion** (runtime cost, theme complexity), **vanilla-extract** (type-safe, more setup).
- **Trade-off:** class lists get long; mitigated with component extraction (shadcn/ui handles this).

### shadcn/ui
- **Why:** not a dependency — you *copy the component source into your repo* and own it. Built on Radix UI (accessible, unstyled primitives) + Tailwind. Fully customizable, no version-lock-in, accessible by default.
- **Alternatives:** **MUI** (mature but heavy and opinionated, harder to customize), **Mantine** (excellent, slightly more opinionated), **Ant Design** (enterprise, opinionated design language).
- **Trade-off:** you maintain the copied components. That's a *feature* for learning and customization.

### TanStack Query (React Query)
- **Why:** the standard for **server state** — caching, background refetching, optimistic updates, request deduping, invalidation. Removes most reasons to hand-roll data fetching.
- **Alternatives:** **SWR** (simpler, fewer features), **RTK Query** (good if already on Redux; heavier), **plain useEffect+fetch** (rejected — reinvents caching badly).
- **Trade-off:** learning curve for cache keys/invalidation. Worth it.

### Zustand (client UI state)
- **Why:** tiny, ergonomic, no boilerplate. For the little client-only state we have (UI toggles, current workspace selection), it's ideal.
- **Alternatives:** **Redux Toolkit** (more power/boilerplate than we need), **Jotai/Recoil** (atomic state, great but overkill), **Context** (fine for low-frequency state, re-renders scale poorly).

### React Hook Form + Zod
- **Why:** performant forms (uncontrolled) + Zod schemas we **share with the backend** for one source of truth on validation.
- **Real-world note:** startups increasingly standardize on Zod end-to-end; it's becoming the default validation layer in the TS ecosystem.

---

## 4. Backend

### NestJS + Node.js LTS + TypeScript
- **Why:** opinionated, modular, DI-first framework whose primitives (modules, providers, guards, interceptors, pipes) map cleanly onto Clean Architecture. TypeScript-native. The structure *teaches* enterprise patterns (DI, SOLID) by convention. Modular-monolith friendly.
- **Alternatives:** **Express/Fastify raw** (too little structure — you'd rebuild NestJS), **Fastify + custom layers** (fastest, but you own the framework), **Hono** (edge-optimized, less mature for our needs), **AdonisJS** (good, smaller community).
- **Trade-off:** NestJS has boilerplate and a learning curve. That's acceptable — and pedagogically valuable — for a project meant to teach real architecture.
- **Runtime:** Node.js LTS for stability; Bun is faster but younger (noted as a future option).

---

## 5. Data Layer

### PostgreSQL
- **Why:** the default relational DB for SaaS — mature, ACID, rich types (JSONB), full-text search, and (critically) the `pgvector` extension. One engine serves relational + vector needs.
- **Alternatives:** **MySQL** (fewer extensions, weaker vector story), **SQLite** (great for local dev/tests, not for multi-writer prod).

### Prisma (ORM)
- **Why:** schema-as-code (`schema.prisma`), type-safe generated client, migration workflow, superb DX. Catches query errors at compile time.
- **Alternatives:** **Drizzle** (lightweight, SQL-like, very fast, newer — the rising favorite of teams who want raw-SQL control), **TypeORM** (decorator-heavy, more traditional), **Kysely** (query builder, type-safe, no ORM magic).
- **Trade-off:** Prisma's schema language is non-standard and its runtime is heavier; complex raw queries are less ergonomic. Mitigation: we keep raw queries rare via good repository design, and we keep Drizzle in mind if Prisma's weight becomes a problem.
- **Real-world note:** Drizzle is gaining ground fast; Prisma still wins on DX and documentation, which matters for learning.

### Redis (cache + rate-limit + queue + refresh-token store)
- **Why:** one tool covers caching, rate limiting, BullMQ's queue, and the refresh-token whitelist. Versatile, fast, ubiquitous.
- **Alternatives:** **Memcached** (cache-only, no data structures/persistence), **in-memory maps** (no shared state across instances — fails when API scales horizontally), **KeyDB/Dragonfly** (Redis-compatible alternatives).

---

## 6. Async Processing

### BullMQ (on Redis)
- **Why:** typed jobs, retries with backoff, priorities, scheduled jobs, rate limiting, dead-letter queues, and a dashboard (Bull Board). Built on the Redis we already use.
- **Alternatives:** **RabbitMQ** (richer routing, separate system — more than we need), **SQS** (AWS lock-in, simpler semantics), **Kafka** (event streaming — wrong tool for task queues), **Temporal** (superb for long durable workflows; steep learning curve — candidate for the roadmap when the pipeline grows more complex).
- **Trade-off:** job state lives in Redis, so Redis durability matters. We configure AOF persistence in prod.

---

## 7. Storage & Vectors

### S3-compatible object storage (S3 in prod, MinIO in dev)
- **Why:** databases aren't file stores; audio blobs and generated exports go to object storage. S3 is the de-facto standard; MinIO gives us an S3-compatible server locally so dev mirrors prod.
- **Alternatives:** **Azure Blob / GCS** (equivalent, cloud-specific), **local FS** (fails across multiple instances — rejected for prod).
- **Design:** access is abstracted behind a `StorageProvider` interface so S3/MinIO/GCS are interchangeable.

### pgvector (vector store)
- **Why:** decided in Phase 2 — vector + relational data in one transactional store, one fewer system to run, HNSW index for fast ANN at our scale.
- **Alternatives:** **Qdrant / Pinecone / Weaviate / Milvus** — each justified only at much larger vector counts or with specialized filtering needs.
- **Trade-off:** above ~10M vectors, dedicated DBs win. Contained to the `SearchModule` infra layer if we ever swap.

---

## 8. AI Models

### Speech-to-Text — Whisper (self-hosted)
- **Why:** open-source, strong accuracy, no per-minute cost, no vendor lock-in, and running it teaches the STT pipeline. Abstracted behind an `STTProvider` interface so a managed API (Deepgram, AssemblyAI, OpenAI) can drop in later.
- **Deployment:** a containerized Whisper service (GPU optional; CPU works for our volumes).
- **Alternatives:** **managed STT APIs** — faster to integrate, often more accurate (esp. diarization), but recurring per-minute cost and lock-in.
- **Trade-off:** we own availability + accuracy tuning. For a learning, self-hostable project, that's the point.
- **Real-world note:** startups usually start on a managed STT for speed, then self-host or fine-tune once unit economics demand it. We're inverting that to learn more.

### LLM — Claude (Anthropic)
- **Why:** high-quality reasoning and instruction-following for structured extraction (summaries, action items, decisions) and grounded chat; strong tool-use/structured-output support; per the project spec.
- **Usage:** structured outputs via tool use / JSON mode; system prompts enforcing citation and "say don't-know" rules.
- **Alternatives:** **OpenAI GPT** (equivalent tier, swappable), **open models via Ollama** (self-hosted, cheaper, lower quality for complex extraction). Abstracted behind an `LLMProvider` interface.

### Embeddings — self-hosted sentence-transformer model
- **Why:** consistent with self-hosting Whisper (no per-call cost, no lock-in); a lightweight model (e.g., `BAAI/bge-small-en` or `all-MiniLM-L6-v2`) is plenty for semantic search over meeting transcripts.
- **Alternatives:** **OpenAI `text-embedding-3-small`** (best-in-class, trivial to use, per-call cost). Abstracted behind an `EmbeddingProvider` interface.
- **Trade-off:** self-hosting adds a small service to run; OpenAI is the zero-ops alternative. Either is one config change away.

> **Provider-agnostic AI layer:** every AI capability (STT, LLM, embeddings) sits behind an interface in the infrastructure layer, so swapping providers is localized — not a rewrite. This is exactly how production AI products manage cost/quality/capability trade-offs over time.

---

## 9. Testing

### Backend — Jest + Supertest
- **Why:** NestJS's default test runner; mature, great mocking, coverage built-in. Supertest drives the HTTP API for integration/E2E tests against a real-ish app instance.
- **Alternatives:** **Vitest** (faster, modern, Jest-compatible API — a strong choice; we keep it in mind).

### Frontend — Vitest + React Testing Library
- **Why:** Vitest is fast and Vite-native; RTL tests components the way users use them (by role/label, not implementation). Together they're the modern standard.
- **Alternatives:** Jest+RTL (fine but slower), Enqueue (deprecated approach).

### E2E — Playwright
- **Why:** fast, reliable, cross-browser, one API for Chromium/Firefox/WebKit, great DX, handles async/modern web apps well. The current leader.
- **Alternatives:** **Cypress** (popular, but slower and architecturally limited for parallel runs).

### Accessibility — axe-core
- **Why:** the de-facto a11y rule engine; we run it in unit tests (`jest-axe`) and E2E (`@axe-core/playwright`) to catch WCAG violations automatically.

### Performance — k6 + Lighthouse CI
- **Why:** k6 for backend/API load testing (JS-authored scenarios); Lighthouse CI for frontend performance budgets in CI.

### Security testing — OWASP ZAP + dependency audit + lint rules
- **Why:** ZAP scans the running app for common vulns; `npm audit`/OSV for known CVEs; ESLint security rules catch risky patterns early.

> **Coverage target:** ≥70% on core (domain + application) logic; we don't chase 100% on trivial getters/setters — coverage is a floor, not a target. (Phase 11 formalizes the strategy.)

---

## 10. Monitoring & Observability

| Pillar | Tool | Why |
|--------|------|-----|
| **Logging** | pino | Fastest structured JSON logger in Node; pairs with any log shipper. |
| **Metrics** | prom-client + Grafana | Open-source, industry-standard; Prometheus scrapes, Grafana visualizes. |
| **Error tracking** | Sentry | Best-in-class runtime error capture with source maps and release tracking. |
| **Tracing** | OpenTelemetry | Vendor-neutral standard; ship traces to Jaeger/Honeycomb/Datadog. |
| **Health checks** | NestJS Terminus | Kubernetes-style liveness/readiness probes. |
| **Uptime** | Better Stack / UptimeRobot | External black-box probes — you can't alert on a metric your monitoring can't reach. |
| **Product analytics** | PostHog | Open-source, self-hostable; funnels, session replay, feature flags. |

- **Alternatives (all-in-one):** **Datadog / New Relic** — excellent but expensive; we prefer open-source for learning and cost control, and they remain easy swaps.

---

## 11. CI/CD & Code Quality

### GitHub Actions
- **Why:** native to GitHub (our likely host), huge marketplace, matrix builds, free tier for OSS. Defines pipelines as YAML in the repo.
- **Workflows (Phase 15):** `lint → typecheck → test → build → security scan → docker build → deploy`.
- **Alternatives:** **GitLab CI** (great, needs GitLab), **CircleCI** (strong, paid at scale), **Jenkins** (self-hosted, heavyweight).

### Code quality gates
- **ESLint + Prettier + TypeScript strict** — consistent, type-safe code.
- **Husky + lint-staged** — run lint/format/typecheck on staged files pre-commit (fast feedback, keeps the repo clean).
- **commitlint (Conventional Commits)** — enforces messages like `feat(meeting): add upload`; enables auto-changelogs and semantic versioning.
- **Alternative:** **Biome** (one tool replacing ESLint+Prettier, very fast) — we note it as a future simplification.

---

## 12. Deployment

### Web — Vercel
- **Why:** zero-config Next.js hosting, global CDN edge, preview deployments per PR (huge for review), automatic builds. The canonical Next.js host.
- **Alternatives:** Netlify, AWS Amplify, self-hosted.

### API + Worker — Railway/Render (start) → AWS ECS Fargate (scale)
- **Why:** Railway/Render give us one-click containers, managed Postgres/Redis add-ons, and trivial deploys — ideal for learning velocity. ECS Fargate is the "serious" production path when we need VPCs, IAM, autoscaling, and compliance.
- **Alternatives:** **Fly.io / GCP Cloud Run** (strong container platforms), **Kubernetes** (powerful but operational overkill at our size).
- **Full recommendation + pros/cons:** Phase 16.

### Managed backing services (prod)
- **Postgres:** Neon / Render Postgres / RDS (managed, automated backups, scaling).
- **Redis:** Upstash (serverless, per-request pricing) or ElastiCache.
- **Storage:** S3.

---

## 13. Supporting Tooling

| Concern | Choice | Why |
|---------|--------|-----|
| Package manager | **pnpm** | Fast, disk-efficient (hardlinks), first-class workspaces, strict about phantom deps. |
| Monorepo structure | **pnpm workspaces** | Web + API + Worker + shared-types in one repo; simpler than Nx/Turborepo at our size. |
| Secrets (dev) | `.env` + dotenv (gitignored) | Local dev standard. |
| Secrets (prod) | Railway/Render vars or AWS Secrets Manager / Doppler | Never in code or plain env files in prod. |
| Feature flags | PostHog flags (or env-based) | Decouple deploy from release. |

> **Monorepo, not polyrepo:** web, API, worker, and shared types live together. This enables shared Zod/types packages (frontend and backend validate against the same schemas) and atomic cross-cutting changes. Modern startups overwhelmingly default to monorepos; we scale up the tooling (Nx/Turborepo) only if build times demand it.

---

## 14. Versioning & Upgrade Policy

- Pin **major** versions in `package.json`; let minors/patches float via lockfile for security patches.
- Node.js: track **LTS** (even-numbered) releases.
- One **"dependency upgrade" issue per month** to surface drift (Renovate/Dependabot can automate PRs).
- Database/AI model upgrades get a migration/A-B evaluation — never a blind bump.

---

## 15. What This Stack Optimizes For — and What It Doesn't

**Optimized for:** learning real-world patterns, end-to-end type safety, local-prod parity, swapability of providers, low operational cost at small scale.

**Not optimized for:** absolute minimum latency (Bun/native could beat Node), zero-ops (we run some services ourselves deliberately), or hyper-scale from day one (we'd start with managed everything + Kubernetes).

This is a deliberate, defensible starting stack. Each piece can evolve independently as requirements grow.

---

## 16. Open Questions (before Phase 4)

1. **Embeddings:** self-hosted model (recommended, no per-call cost) vs. OpenAI embeddings (zero-ops)? Either is a config swap.
2. **Deployment host:** any preference for Railway/Render vs. AWS now, or defer the real decision to Phase 16?
3. **Monorepo tooling:** pnpm workspaces (recommended, simplest) — or do you want Turborepo/Nx from the start (more build caching)?

---

*End of Phase 3 deliverable. Approval required before Phase 4 (Repository Structure).*
