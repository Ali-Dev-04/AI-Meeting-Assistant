# Contributing

| Field | Value |
|-------|-------|
| Phase | 4 of 18 — Repository Structure |
| Status | Draft, pending approval |

Thanks for contributing! This guide covers setup, the **git workflow**, **branch strategy**,
**commit convention**, and the **pull-request process**. Following it keeps history clean,
deploys safe, and reviews fast.

---

## 1. Development setup

**Prerequisites:** Node.js 20+ (`.nvmrc`), pnpm 9+, Docker.

```bash
pnpm install                      # installs all workspaces + Husky hooks
cp .env.example .env              # fill in local values
docker compose -f docker/docker-compose.dev.yml up -d   # backing services (Phase 14)
pnpm --filter @ama/api prisma migrate dev               # apply DB schema (Phase 5/9)
pnpm --filter @ama/api prisma db seed                   # seed data (Phase 5)
pnpm --filter @ama/web dev                              # start frontend
```

Husky installs hooks automatically (`prepare` script). Your first commit will be linted and
commit-checked.

---

## 2. Git workflow — Trunk-based development

We use **trunk-based development** (a close cousin of GitHub Flow): a single long-lived
`main` branch that is always deployable, with short-lived feature branches merged back via PR.

```
main (always green, always deployable)
 │
 ├── feat/meeting-upload ──┐
 ├── fix/auth-refresh ─────┼──► PR (review + CI) ──► squash merge to main
 └── chore/deps ───────────┘
```

**Why trunk-based (not GitFlow)?**
- *GitFlow* (develop/release/hotfix branches) suits scheduled-release products; it adds ceremony
  and merge debt.
- *Trunk-based* suits continuously-deployed SaaS: tiny batches, fast integration, fewer conflicts,
  simpler mental model. It's the default at most modern startups and large-scale orgs (Google,
  Netflix, Facebook).
- *Trade-off:* requires discipline — branches must be short-lived and CI must be fast. We enforce
  both.

**Rules:**
- `main` is **always green**. Never commit directly to `main` (protected branch).
- Branch off the latest `main`; rebase if `main` moves under you.
- **Merge by squash** so each PR becomes one clean commit on `main`.
- **Tag releases** (`v0.1.0`, …) for deployable milestones.

### Branch naming

`<type>/<short-description>` — optionally with a ticket ID:

```
feat/meeting-upload
fix/jwt-refresh-rotation
chore/upgrade-nestjs
docs/api-endpoints
feat/AMA-123-action-item-extraction
```

---

## 3. Commit convention — Conventional Commits

Every commit message follows [Conventional Commits](https://www.conventionalcommits.org/),
enforced by commitlint on `commit-msg`:

```
<type>(<scope>): <subject>

<body — optional, wrap at 100 chars>

<footer(s) — optional: BREAKING CHANGE:, issue refs>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`,
`revert` (full list in `commitlint.config.js`).

**Examples:**
```
feat(meeting): add audio upload endpoint with quota check
fix(auth): rotate refresh token on every use
docs(api): document meeting endpoints
perf(search): add HNSW index to embedding column
refactor(billing): extract quota guard into shared module
```

**Breaking changes** bump the footer and (optionally) the type:
```
feat(auth)!: replace cookie auth with bearer tokens

BREAKING CHANGE: clients must send Authorization header; cookie session removed.
```

**Why Conventional Commits?**
- Machine-readable history → auto-generated changelogs and **semantic versioning**.
- The `type` communicates intent at a glance (`feat` vs `fix` vs `chore`).
- `!` / `BREAKING CHANGE` makes breaking changes unmissable in review and release notes.

> Since we squash-merge PRs, the PR title becomes the commit on `main` — **write the PR title in
> Conventional Commits format too.**

---

## 4. Pull-request process

1. **Open a PR** against `main` using `.github/PULL_REQUEST_TEMPLATE.md`.
2. **Link the related issue** (e.g., `Closes #42`).
3. **Self-review** your diff first.
4. **Ensure CI is green** (lint, typecheck, tests, build).
5. **Request one review.** `CODEOWNERS` auto-suggests reviewers.
6. **Address feedback** with new commits on the branch (they'll be squashed).
7. **Squash-merge** once approved + green. Delete the branch.

### What reviewers expect (and what to give them)
- A clear **summary** of *what* and *why*.
- **How to test** the change manually.
- **Tests** covering new behavior.
- **Docs updated** where behavior changed.
- **Breaking changes** called out explicitly.

### Definition of Done
- [ ] Code follows `CODING_STANDARDS.md`
- [ ] Tests added/updated and passing
- [ ] CI green
- [ ] Documentation updated
- [ ] Reviewed and approved
- [ ] No secrets in the diff
- [ ] Merged and branch deleted

---

## 5. Code review etiquette

- **Be kind.** Critique the code, not the person.
- **Be specific.** "This could fail if X is null" beats "this looks buggy."
- **Suggest, don't command.** Prefer "Consider extracting this?" over "Extract this."
- **Praise good work** publicly; it reinforces good patterns.
- **Distinguish** blocking issues (correctness, security) from nits (style) — label nits.

---

## 6. Releases

- We use **semantic versioning**: `MAJOR.MINOR.PATCH`.
- Conventional Commits drive automated version bumps (a `feat` → MINOR, a `fix` → PATCH, `!` → MAJOR).
- Every release is **tagged** on `main` and deployed via the CI pipeline (Phases 15–16).

---

*Questions about process? Open a `docs` PR or discuss in an issue.*
