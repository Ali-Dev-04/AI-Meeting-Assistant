# Documentation Index

Everything lives in `docs/` and travels with the code (reviewed in PRs, versioned with the system).

## Project (Phases 1–3)
- [PRD.md](./PRD.md) — product vision, requirements, scope, personas
- [architecture.md](./architecture.md) — system design + diagrams (HLD/LLD/dataflow/sequence)
- [tech-stack.md](./tech-stack.md) — technology choices & trade-offs

## Engineering (Phases 4–7)
- [REPOSITORY_STRUCTURE.md](./REPOSITORY_STRUCTURE.md) — folder-by-folder guide
- [CODING_STANDARDS.md](./CODING_STANDARDS.md) — how we write code
- [CONTRIBUTING.md](./CONTRIBUTING.md) — git workflow, branches, commits, PRs
- [database.md](./database.md) — schema, ERD, indexes, migrations
- [api.md](./api.md) — REST contract, errors, pagination, OpenAPI
- [ui-ux.md](./ui-ux.md) — wireframes, flows, responsive/dark/a11y

## Build & operate (Phases 8–18)
- [ai-workflows.md](./ai-workflows.md) — every AI workflow explained
- [testing.md](./testing.md) — test strategy across the stack
- [security.md](./security.md) — controls + STRIDE threat model
- [performance.md](./performance.md) — caching, scaling, optimization
- [deployment.md](./deployment.md) — Railway/Render vs AWS, deploy guide
- [monitoring.md](./monitoring.md) — logs/metrics/tracing/errors/uptime
- [developer-guide.md](./developer-guide.md) — get up and running
- [maintenance.md](./maintenance.md) — keeping it healthy in production

## Quickstart
```bash
pnpm install
cp .env.example .env                       # fill in values
docker compose -f docker/docker-compose.yml up -d postgres redis minio
pnpm --filter @ama/api prisma migrate dev  # + the HNSW/tsvector migration (database.md §6-7)
pnpm --filter @ama/api prisma db seed
pnpm --filter @ama/api dev                 # API :4000  (Swagger /api/docs)
pnpm --filter @ama/api dev:worker          # worker
pnpm --filter @ama/web dev                 # web :3000
```
Login (seed): `owner@acme.test` / `password123`.
