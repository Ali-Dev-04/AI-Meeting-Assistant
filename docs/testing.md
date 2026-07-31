# Testing Strategy

| Field     | Value                              |
|-----------|------------------------------------|
| Version   | 1.0                                |
| Status    | Phase 11 — Draft, pending approval |
| Date      | 2026-07-23                         |
| Phase     | 11 of 18 — Testing                 |

How we test across the stack: what we test, with what, and the coverage bar.

---

## 1. The testing pyramid

```
        /\
       /E2E\        few, slow, high-confidence (Playwright)
      /------\
     /  Integ  \    moderate (Supertest against a Nest app instance)
    /------------\
   /     Unit     \  many, fast (Jest / Vitest)
  /----------------\
```

Fast feedback at the bottom (run on every save), confidence at the top (run in CI).

---

## 2. Backend (NestJS) — Jest + ts-jest

- **Config:** `apps/api/jest.config.js` (ts-jest preset, maps `@ama/shared-types` to source).
- **Run:** `pnpm --filter @ama/api test` · `test:watch` · `test:cov`.
- **Coverage bar:** ≥70% on lines/branches/functions/statements (enforced as a threshold).

### Unit tests (implemented now, pattern for the rest)
Pure logic and services with **mocked** dependencies — no DB/Redis/network.
- `auth.util.spec.ts` — hashing, duration parsing, slugify, DTO stripping (sensitive-field safety).
- `usage.service.spec.ts` — quota enforcement (under/over limit, unlimited plans), Prisma mocked
  via `Test.createTestingModule`.

> *Pattern:* build a `Test.createTestingModule`, replace `PrismaService`/providers with `useValue`
> mocks, assert behavior + thrown `AppError` subclasses. Every service follows this.

### Integration tests (next, same harness)
Spin a Nest app with `NestFactory.create` against a **test database** (per-run schema via
`prisma migrate deploy`), drive HTTP with **Supertest**. Cover: auth flow (register→login→refresh→
me), meeting create/complete/list, search, action-item update — including the 401/403/404/409/402
error paths and tenant isolation (user A cannot see workspace B's meetings).

### E2E / worker
- The processing pipeline tested with **stub providers** (`STT_PROVIDER`/`LLM_PROVIDER`/
  `EMBEDDING_PROVIDER` bound to fakes) — assert the meeting ends `READY` with stored
  transcript/summary/embeddings. This is the highest-leverage pipeline test and needs no real AI.

---

## 3. Frontend (Next.js) — Vitest + React Testing Library + Playwright

- **Unit/component:** Vitest + RTL — render components, assert behavior, mock `apiRequest`/hooks.
- **E2E:** Playwright — the "aha" flow (signup → upload → processing → summary → ask chat) against
  a running stack. Cross-browser; runs in CI.
- **A11y:** `jest-axe` (component) + `@axe-core/playwright` (E2E) — CI fails on WCAG violations.
- (Libs are already declared in `apps/web` deps per `tech-stack.md`.)

---

## 4. Performance — k6 + Lighthouse CI

- **Backend load:** k6 scripts ramping concurrent users against list/search/chat; assert p95 latency
  (<300ms) and error rate.
- **Frontend:** Lighthouse CI budgets (LCP < 2.5s, CLS < 0.1) gating deploys.

---

## 5. Security — OWASP ZAP + dependency audit + lint

- **ZAP** baseline scan of the running API in CI (catches common injection/header issues).
- **Dependency audit:** `pnpm audit` / OSV in CI; Renovate/Dependabot PRs.
- **Static checks:** ESLint security rules; the `no-secrets` guard (`.env` gitignored; checked in CI).
- **Auth-specific tests:** refresh-token rotation invalidates the old token; cross-tenant → 404;
  rate-limit on `/auth/*` triggers 429.

---

## 6. What runs where

| Stage | What | Speed |
|-------|------|-------|
| **Pre-commit** (Husky) | lint-staged (format + lint) | seconds |
| **On save** | unit tests (`test:watch`) | seconds |
| **CI per PR** | lint, typecheck, unit + integration, build | minutes |
| **CI nightly/merge** | E2E, a11y, perf, security scans | slower |

---

## 7. Principles

- **Test behavior, not implementation** — refactor freely under green tests.
- **Arrange / Act / Assert** — one assertion concept per test, named by behavior.
- **Coverage is a floor, not a goal** — don't write meaningless tests to hit 100%.
- **Fail fast, fail clear** — assertions message what was expected vs. actual.

---

*End of Phase 11 deliverable. Representative unit tests + config are implemented; integration/E2E/
a11y/perf/security suites follow the documented patterns. Approval required before Phase 12 (Security).*
