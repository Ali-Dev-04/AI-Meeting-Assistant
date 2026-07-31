<div align="center">

# AI Meeting Assistant

**Turn meeting recordings into searchable, actionable knowledge.**
Transcription · AI summaries · Action items & decisions · Semantic search · Meeting chat

A production-grade, learning-oriented build of the Fireflies.ai / Otter.ai category.

</div>

---

## Overview

AI Meeting Assistant is a B2B SaaS that lets teams upload meeting audio/video and get back
an accurate transcript, a structured AI summary, extracted action items and decisions, and the
ability to **search** and **chat** across all of their meetings. It is built as a modular monolith
with an asynchronous AI-processing pipeline.

> **Build status:** Phases 1–4 complete (business, architecture, tech selection, repo structure).
> Feature code (frontend/backend/AI) lands in Phases 8–10. See [`docs/`](./docs) for the plan.

## Highlights

- 🎙️ **Upload-first ingestion** (real-time bot is a roadmap item) — see `docs/PRD.md`.
- 🧠 **Provider-agnostic AI layer** — Whisper, Claude, and embeddings each sit behind an interface.
- 🔍 **Semantic search + RAG chat** via `pgvector`.
- 🏗️ **Clean Architecture + modular monolith** — testable core, swappable infrastructure.
- 🐳 **Local-prod parity** via Docker Compose (Phase 14).

## Tech stack (summary)

| Area | Tech |
|------|------|
| Frontend | Next.js, React, TypeScript, TailwindCSS, shadcn/ui, TanStack Query |
| Backend | NestJS, Node.js LTS, TypeScript |
| Data | PostgreSQL + pgvector, Prisma, Redis |
| Async | BullMQ |
| Storage | S3-compatible (MinIO locally) |
| AI | Whisper (self-hosted), Claude, self-hosted embeddings |

Full rationale: [`docs/tech-stack.md`](./docs/tech-stack.md).

## Repository structure

```
ai-meeting-assistant/
├── apps/        # Deployable apps: web (Next.js), api (NestJS), worker (NestJS)
├── packages/    # Shared libs: types/schemas, eslint & tsconfig presets
├── docs/        # All project documentation (PRD, architecture, standards…)
├── docker/      # Dockerfiles & compose (Phase 14)
└── .github/     # PR & issue templates, CI workflows (Phase 15)
```

Every folder is explained in [`docs/REPOSITORY_STRUCTURE.md`](./docs/REPOSITORY_STRUCTURE.md).

## Prerequisites

- **Node.js** 20 LTS+ (see `.nvmrc`)
- **pnpm** 9+ (`npm i -g pnpm`)
- **Docker** + Docker Compose (for local Postgres/Redis/MinIO/AI services)

## Getting started

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env      # then edit values

# 3. Start backing services (Phase 14 provides the compose file)
docker compose -f docker/docker-compose.dev.yml up -d

# 4. Run apps (wired in Phase 8/9)
pnpm --filter @ama/web dev      # frontend on :3000
pnpm --filter @ama/api dev      # API on :4000
pnpm --filter @ama/worker dev   # worker
```

## Common scripts

| Command | Description |
|---------|-------------|
| `pnpm lint` | Lint the whole monorepo |
| `pnpm format` | Format all files with Prettier |
| `pnpm typecheck` | Type-check all packages |
| `pnpm test` | Run unit/integration tests across packages |
| `pnpm build` | Build all apps |

Pre-commit hooks (Husky) auto-format/lint staged files and enforce Conventional Commits.

## Documentation

| Doc | What it covers |
|-----|----------------|
| [`docs/PRD.md`](./docs/PRD.md) | Product requirements, personas, scope |
| [`docs/architecture.md`](./docs/architecture.md) | System design + diagrams |
| [`docs/tech-stack.md`](./docs/tech-stack.md) | Technology choices & trade-offs |
| [`docs/REPOSITORY_STRUCTURE.md`](./docs/REPOSITORY_STRUCTURE.md) | Folder-by-folder guide |
| [`docs/CODING_STANDARDS.md`](./docs/CODING_STANDARDS.md) | How we write code |
| [`docs/CONTRIBUTING.md`](./docs/CONTRIBUTING.md) | Git workflow, branches, commits, PRs |

## Contributing

We use **trunk-based development**, **Conventional Commits**, and **small reviewed PRs**.
Please read [`docs/CONTRIBUTING.md`](./docs/CONTRIBUTING.md) before opening a pull request.

## License

[MIT](./LICENSE)
