# Repository Structure

| Field | Value |
|-------|-------|
| Phase | 4 of 18 — Repository Structure |
| Status | Draft, pending approval |

This document explains **every folder and key file** in the monorepo and *why* it exists.
The structure is designed to scale from one developer to a small team without reorganization.

---

## Guiding principles

1. **Monorepo** — all apps and shared packages in one repo, so contracts stay in sync and
   cross-cutting changes are atomic.
2. **Apps vs packages** — *apps/* are deployable; *packages/* are shared libraries.
3. **Feature-oriented inside apps** — code is grouped by business capability (feature modules),
   not by technical role, so a feature's code lives together.
4. **Clean Architecture layering** — within each feature, dependencies point inward
   (web → application → domain ← infrastructure). See `architecture.md`.
5. **Convention over configuration** — predictable locations reduce cognitive load.

---

## Full tree

```
ai-meeting-assistant/
├── .github/                     # GitHub automation: templates, CI workflows
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.yml
│   │   ├── feature_request.yml
│   │   └── config.yml
│   ├── workflows/               # GitHub Actions (Phase 15)
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── CODEOWNERS
│
├── .husky/                      # Git hooks (run automatically on commit)
│   ├── pre-commit               # → lint-staged (format + lint staged files)
│   └── commit-msg               # → commitlint (enforce Conventional Commits)
│
├── apps/                        # Deployable applications
│   ├── web/                     # Next.js frontend  (Phase 8)
│   ├── api/                     # NestJS REST API   (Phase 9)
│   └── worker/                  # NestJS worker     (Phase 9)
│
├── packages/                    # Shared, non-deployable libraries
│   ├── shared-types/            # TS types + Zod schemas (API contracts)
│   ├── config-eslint/           # Shared ESLint presets
│   └── config-tsconfig/         # Shared tsconfig bases
│
├── docker/                      # Container definitions (Phase 14)
│   ├── docker-compose.dev.yml   # Local: postgres+pgvector, redis, minio, AI services
│   ├── Dockerfile.web
│   ├── Dockerfile.api
│   └── Dockerfile.worker
│
├── docs/                        # All project documentation
│   ├── PRD.md
│   ├── architecture.md
│   ├── tech-stack.md
│   ├── REPOSITORY_STRUCTURE.md  # ← this file
│   ├── CODING_STANDARDS.md
│   ├── CONTRIBUTING.md
│   ├── database.md              # (Phase 5)
│   ├── api.md                   # (Phase 6)
│   └── ui-ux.md                 # (Phase 7)
│
├── .env.example                 # Template for required environment variables
├── .gitignore
├── .editorconfig                # Editor-neutral formatting basics
├── .nvmrc                       # Node version pin
├── .npmrc                       # pnpm behavior flags
├── .prettierrc / .prettierignore
├── eslint.config.mjs            # Root flat config (ESLint v9+)
├── commitlint.config.js         # Conventional Commits rules
├── lint-staged.config.js        # Pre-commit format/lint targets
├── tsconfig.base.json           # Strict TS base inherited by all packages
├── pnpm-workspace.yaml          # Declares apps/* and packages/* as workspaces
├── package.json                 # Workspace root: shared scripts + dev tooling
├── LICENSE                      # MIT
└── README.md
```

---

## Folder-by-folder rationale

### `.github/`
Automation that lives with the code. Issue and PR templates standardize communication;
`CODEOWNERS` auto-requests review; `workflows/` holds CI (lint/test/build/security) — added in
Phase 15. *Why here:* GitHub convention; keeps process versioned with the code.

### `.husky/`
Local git hooks. They make standards **enforced**, not optional — a bad commit message or
unformatted file is rejected before it lands. *Why hooks over CI-only:* instant feedback at the
developer's machine, so CI isn't a formatting gatekeeper.

### `apps/`
The three deployables. Splitting API from Worker lets them scale and fail independently (the
worker can be busy transcribing without slowing API responses). `web` is separated because it
deploys to a CDN/edge, not a container runtime. Each app is its own workspace package
(`@ama/web`, `@ama/api`, `@ama/worker`).

**Inside `apps/api` (NestJS, Phase 9):**
```
apps/api/
├── src/
│   ├── main.ts                  # Bootstrap: Nest app, Swagger, pipes, filters
│   ├── app.module.ts            # Root module composition
│   ├── common/                  # Cross-cutting: filters, guards, interceptors, decorators, pipes
│   ├── config/                  # Typed config from env (validation on boot)
│   ├── infrastructure/          # Adapters: prisma, redis, s3, ai-clients (STT/LLM/embedding), queue
│   └── modules/                 # Feature modules (bounded contexts)
│       ├── auth/
│       ├── users/
│       ├── workspaces/
│       ├── meetings/
│       ├── processing/          # Job orchestration + status
│       ├── search/
│       ├── chat/
│       ├── billing/
│       └── notifications/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── test/                        # Jest E2E setup (NestJS convention)
```

Each feature module follows the layered pattern:
```
modules/meetings/
├── dto/                         # Request/response shapes + Zod validation
├── meetings.controller.ts       # Web layer: HTTP only
├── meetings.service.ts          # Application layer: use-cases/orchestration
├── domain/                      # Entities + business rules (no framework imports)
├── repositories/                # Interfaces (domain) + Prisma impl (infra)
└── meetings.module.ts           # Wires it all together
```

### `packages/`
Shared code consumed via `workspace:*`. The keystone is **`shared-types/`**: it holds the Zod
schemas and TS types that define the API contract, imported by *both* `web` and `api`. This is
what makes the frontend and backend impossible to drift apart — a single source of truth.

`config-eslint/` and `config-tsconfig/` centralize tooling so every package inherits the same
strict baseline instead of each maintaining its own.

### `docker/`
Container definitions and the dev compose file (Phase 14). Keeping Dockerfiles in one place
(rather than per-app) makes the deployment story easy to read at a glance. The dev compose file
spins up Postgres+pgvector, Redis, MinIO, and the self-hosted AI services so `apps/` run against
the same stack locally that they will in production.

### `docs/`
The single source of project knowledge. Phases 5–7 and 18 add more docs here. *Why a docs/ folder
and not a wiki:* docs travel with the code, get reviewed in PRs, and are versioned with the system
they describe.

---

## Key file rationale

| File | Purpose |
|------|---------|
| `package.json` (root) | Workspace root; holds cross-cutting dev tooling and orchestration scripts (`pnpm -r …`). App-specific deps live in each app's own `package.json`. |
| `pnpm-workspace.yaml` | Tells pnpm which folders are packages. |
| `tsconfig.base.json` | Strictest reasonable TS settings, inherited everywhere. Strictness is non-negotiable; it prevents entire classes of bugs. |
| `eslint.config.mjs` | Flat config (ESLint v9 standard). Enforces quality rules uniformly. |
| `.env.example` | Documents every required variable. The app **fails fast** at boot if a required var is missing — no silent misconfiguration. |
| `commitlint.config.js` | Machine-readable commit history → enables auto-generated changelogs and semantic versioning. |
| `lint-staged.config.js` | Only touches staged files → fast commits. |

---

## Scaling the structure

This layout scales without reorganization:

- **More features** → add modules under `apps/api/src/modules/`.
- **New app** (e.g., a real-time bot service) → add `apps/bot/`.
- **Extracted microservice** → a module becomes its own app; shared code already lives in `packages/`.
- **More shared libs** → add `packages/<name>/`.

---

*End of Phase 4 deliverable (part 1). Companion docs: CODING_STANDARDS.md, CONTRIBUTING.md.*
