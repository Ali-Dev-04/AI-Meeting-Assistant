# Coding Standards

| Field | Value |
|-------|-------|
| Phase | 4 of 18 — Repository Structure |
| Status | Draft, pending approval |

These standards exist to keep the codebase **readable, predictable, and safe to change** as it
grows. Every rule below has a *why*. Following them is enforced partly by tooling (ESLint,
Prettier, TypeScript strict, Husky) and partly by code review.

---

## 1. TypeScript

- **`strict: true` is the baseline** (see `tsconfig.base.json`). No `any` without a code-review
  justification and a `// why:` comment. *Why:* strictness eliminates entire bug classes at
  compile time.
- **Explicit return types on public APIs** (controllers, exported services, library functions).
  Inference is fine for local helpers. *Why:* explicit contracts prevent accidental API drift.
- **Prefer `interface` for object contracts, `type` for unions/aliases.** Be consistent within a file.
- **Use `import type` for type-only imports** (enforced by `consistent-type-imports`).
  *Why:* cleaner build output and clear intent.
- **Validate all external input** with Zod at the boundary; never trust incoming data.

## 2. Naming

| Element | Convention | Example |
|---------|-----------|---------|
| Files (non-React) | `kebab-case.ts` | `meeting.service.ts` |
| React components | `PascalCase.tsx` | `MeetingCard.tsx` |
| Classes / interfaces / types | `PascalCase` | `MeetingService`, `Meeting` |
| Functions / variables | `camelCase` | `transcribeAudio` |
| Constants | `SCREAMING_SNAKE_CASE` | `MAX_UPLOAD_MB` |
| Env variables | `SCREAMING_SNAKE_CASE` | `DATABASE_URL` |
| Private members | leading underscore | `_internalCache` |

NestJS file suffixes follow the framework's convention: `*.service.ts`, `*.controller.ts`,
`*.module.ts`, `*.dto.ts`, `*.guard.ts`, `*.repository.ts`.

## 3. Architecture & layering (Clean Architecture)

- **Dependencies point inward** (web → application → domain). The domain layer imports nothing
  from frameworks or infrastructure.
- **Controllers know nothing about persistence.** They translate HTTP ↔ application calls only.
- **Don't leak ORM entities through the API.** Map domain entities → response DTOs at the boundary.
  *Why:* decouples the API shape from the database shape, so each can evolve independently.
- **One responsibility per class** (SRP). If a class has "and" in its description, split it.
- **Depend on abstractions, not concretions** (DIP). Services depend on repository *interfaces*;
  the Prisma implementation is injected.

## 4. Error handling

- **Throw typed domain errors** (`NotFoundError`, `ForbiddenError`, `ValidationError`, …). A global
  exception filter maps them to consistent HTTP responses.
- **Never swallow errors.** Catch only what you handle; re-throw or log the rest.
- **Fail fast on bad config.** Validate env vars at boot — the app should refuse to start if a
  required variable is missing.
- **No business logic in try/catch.** Catch at boundaries (filters, job error handlers).

## 5. React / Next.js

- **Functional components + hooks only.** No class components.
- **Composition over inheritance.** Build small, composable components.
- **Colocate** styles, tests, and sub-components with the component they belong to.
- **Server Components by default**; add `'use client'` only when you need interactivity/browser APIs.
- **Server state via TanStack Query; client UI state via Zustand.** Don't duplicate server data
  into client state.
- **Accessible by default:** semantic HTML, labels on inputs, keyboard operability. (Verified by
  axe-core in tests.)

## 6. NestJS

- **One module per feature.** Modules export a minimal public API.
- **Validate with DTOs + `ValidationPipe`** at the controller boundary.
- **Use guards for authorization, interceptors for cross-cutting concerns** (logging, mapping).
- **Keep controllers thin.** Business logic lives in services.

## 7. Testing

- **Name tests by behavior**, not implementation: `transcribes an mp3 and stores segments`.
- **Arrange / Act / Assert** structure.
- **Test the public behavior, not private methods.** Refactor freely under a green test.
- **Target ≥70% coverage on domain + application layers.** Coverage is a floor, not a goal —
  don't write meaningless tests to hit a number.
- **Fast unit tests; slower integration/E2E separated** so the quick feedback loop stays quick.

## 8. Comments & documentation

- **Comments explain *why*, not *what*.** The code already says what.
- **JSDoc on exported public APIs** in `packages/` — they are consumed by other packages.
- **Keep `docs/` in sync** with significant behavior changes in the same PR.

## 9. Dependencies & security

- **No new dependency without justification.** Every dep is a supply-chain and maintenance cost.
- **Prefer standard, well-maintained libraries.** Check license, maintenance, and bundle size.
- **Never commit secrets.** All secrets via env vars; `.env` is gitignored.
- **Lockfile committed** (`pnpm-lock.yaml`); updates go through reviewed PRs (Dependabot/Renovate).

## 10. Pull request hygiene

- **Small, focused PRs** (< ~400 lines of diff where possible). Easier to review, easier to revert.
- **Green CI before review request.**
- **Update tests and docs in the same PR** as the code change.
- **Self-review your diff** before requesting review.

---

*These standards are a living document. Propose changes via PR to this file.*
