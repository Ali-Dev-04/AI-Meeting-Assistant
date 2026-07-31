# packages/

Shared, non-deployable libraries consumed by the apps via the pnpm workspace
(referenced as `workspace:*`). Keeping shared code here avoids duplication and
enforces a single source of truth across the monorepo.

| Package | Purpose | Phase |
|---------|---------|-------|
| `shared-types/` | Shared TypeScript types + Zod schemas (API contracts, DTOs, enums). Imported by both `web` and `api`. | Phase 6+ |
| `config-eslint/` | Shared ESLint flat config presets (Next.js / NestJS). | Phase 8/9 |
| `config-tsconfig/` | Shared tsconfig bases (node, web). | Phase 8/9 |

> Shared types + Zod are the **contract layer**: the frontend and backend
> validate against the same schemas, so an API change cannot silently break
> the client at runtime.
