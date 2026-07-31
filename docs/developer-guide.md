# Developer Guide

| Field | Value |
|-------|-------|
| Phase | 18 of 18 — Documentation |

## Prerequisites
- Node.js 20 LTS (`.nvmrc`), pnpm 9+, Docker.

## First-time setup
```bash
pnpm install
cp .env.example .env          # then fill in real values
docker compose -f docker/docker-compose.yml up -d postgres redis minio
pnpm --filter @ama/api prisma migrate dev
pnpm --filter @ama/api prisma db seed
```
Add the **HNSW + tsvector raw migration** from `docs/database.md` §6–7 before using search/chat.

## Daily run
```bash
pnpm --filter @ama/api dev          # API on :4000
pnpm --filter @ama/api dev:worker   # worker
pnpm --filter @ama/web dev          # web on :3000
```
Or the whole stack: `docker compose -f docker/docker-compose.yml up --build`.

## Common commands (run from repo root)
| Command | Action |
|---------|--------|
| `pnpm lint` / `pnpm format` | Lint/format everything |
| `pnpm typecheck` | Typecheck all packages |
| `pnpm test` | Unit tests |
| `pnpm build` | Build apps |
| `pnpm --filter @ama/api test:cov` | Coverage report |

## How to add a feature (end-to-end)
1. **Contract** — add/update a Zod schema in `packages/shared-types/src` (re-export from `index.ts`).
2. **Backend** — add a Nest module (`controller` + `service` + `dto`); validate with
   `ZodValidationPipe`; register it in `AppModule` (or `WorkerModule` for jobs). Migrate if schema
   changes (`prisma migrate dev`).
3. **Frontend** — add an API hook + component/page; reuse the shared schema in the form.
4. **Test** — a `.spec.ts` for the service; an integration/E2E test for the endpoint.
5. **Docs** — update `api.md`/`database.md` in the same PR.

## Conventions cheat-sheet
- Clean Architecture layers: web → application → domain ← infra (`architecture.md`).
- Commits: Conventional Commits (`feat(meeting): …`); squash-merge to `main`.
- Routes are protected by default — use `@Public()` to opt out.
- Tenant scoping: always filter by the resolved workspace; cross-tenant → 404.

## Debugging tips
- **Swagger UI** at `http://localhost:4000/api/docs` (Authorize → paste access token).
- **Prisma Studio**: `pnpm --filter @ama/api prisma:studio`.
- **BullMQ**: watch the worker logs; failed jobs land in Bull's failed set (retry/dead-letter).
- **Request tracing**: every response has `X-Request-Id`, echoed in logs and errors.
