# Maintenance Guide

| Field | Value |
|-------|-------|
| Phase | 18 of 18 — Documentation |

## Dependencies
- **Renovate/Dependabot** opens version-bump PRs; review + run CI before merge.
- Monthly **dependency-upgrade** issue; test the app against major bumps in a branch.
- `pnpm audit` in CI for known CVEs; pin majors, float patch/minor via the lockfile.

## Database
- **Migrations:** `prisma migrate dev` (local), `prisma migrate deploy` (prod). Always review
  generated SQL. Use **expand → contract** for breaking changes; build indexes `CONCURRENTLY`.
- **Backups:** managed Postgres automated backups + PITR; verify restore quarterly.
- **Re-embedding:** if the embedding model changes, bump its version, backfill all chunks, then swap
  reads (see `database.md` §9).
- **Vacuum/analyze** on schedule; monitor bloat on hot tables.

## Secrets & access
- Rotate API/JWT/DB secrets via the platform secret store; no secrets in code or committed files.
- Periodically review workspace membership + audit logs; remove stale access.

## Health & operations
- Watch `/api/v1/health/ready`, Sentry error rate, queue depth, p95 latency, DB connections.
- Worker autoscaling target: BullMQ queue depth; alert on sustained backlog.
- Clean up old job data (BullMQ `removeOnComplete`/`removeOnFail` set; tune retention).

## Scaling triggers (when to act)
| Signal | Action |
|--------|--------|
| API p95 rising | scale API instances; add read replica; cache more |
| Queue backlog grows | scale worker; raise concurrency |
| DB CPU high | scale up RDS; add replicas; optimize queries |
| AI cost rising | tighten quotas; cache; tier models |
| Storage growth | lifecycle rules to cheaper tiers for old media |

## Incident runbook
1. **Acknowledge** — note impact in the status channel; page on-call if user-impacting.
2. **Stabilize** — roll back to the previous image tag; scale workers; shed load if needed.
3. **Diagnose** — trace via `X-Request-Id` → logs → Sentry; check health/metrics/dashboard.
4. **Fix** — patch in a PR, rebuild image, redeploy.
5. **Postmortem** — blameless write-up: timeline, root cause, prevention; track follow-ups.

## Tech debt
- Track as labeled issues; allocate a slice each cycle. Refactor under green tests (Phase 11).
- Keep `docs/` in sync — a doc that contradicts the code rots fast.

---

*End of Phase 18 deliverable — and the end of the 18-phase build.*
