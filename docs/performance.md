# Performance Optimization

| Field     | Value                              |
|-----------|------------------------------------|
| Version   | 1.0                                |
| Status    | Phase 13 — Draft, pending approval |
| Date      | 2026-07-23                         |
| Phase     | 13 of 18 — Performance             |

Most performance work was designed in from earlier phases; this consolidates the strategy and adds
application-level caching. Targets: **API p95 < 300ms**, **upload→ready p95 < 5 min**, frontend
**LCP < 2.5s**, **CLS < 0.1**.

---

## 1. Caching

| Layer | What | How |
|-------|------|-----|
| **Redis (app)** | Hot reads | `CacheService` — e.g. active-workspace lookup (every request), 60s TTL |
| **React Query** | Server state on the client | `staleTime` 60s, `placeholderData` on search, dedup |
| **HTTP** | Static/immutable | Cache-Control headers on CDN assets |
| **Computed-once** | Transcripts/summaries/embeddings | generated per meeting, never per read |

- **Invalidation:** short TTLs keep data fresh without complex invalidation. On workspace/membership
  changes we `cache.del(...)` the affected keys. Etag/`Last-Modified` for heavy GETs as needed.
- **What NOT to cache:** per-user-instantaneous data (newly uploaded meeting status) — poll instead.

## 2. Background jobs & async processing

- All slow AI work runs on **BullMQ in the worker**, off the request path → API stays fast.
- **Backpressure:** queue concurrency caps + BullMQ rate limiting protect AI-provider rate limits.
- **Idempotent, retryable** jobs with exponential backoff + dead-letter queue.

## 3. Streaming

- **Chat answers stream over SSE** → low time-to-first-token instead of waiting for the full answer.
- **Upload progress** is client-side (XHR upload events); processing status polled/SSE.

## 4. Database optimization

- **Indexes** on every `workspace_id`/`meeting_id`/`user_id` FK, composites for common filters, and
  unique constraints for invariants (`docs/database.md` §5).
- **pgvector HNSW** index for sub-linear ANN search.
- **Cursor pagination** (stable + fast deep into results) instead of offset.
- **Projection:** Prisma `select` to fetch only needed columns on hot paths (apply as queries grow).
- **Connection pooling:** PgBouncer in prod; Prisma reads via the pooled `DATABASE_URL`, migrations
  via `DIRECT_URL`.
- **N+1 prevention:** use `include`/nested writes, not loops of single queries.

## 5. Frontend performance

- **Code-splitting / lazy loading:** Next.js App Router code-splits per route; **meeting-detail tabs
  load their data lazily** (Radix unmounts inactive panels).
- **React Query** prevents redundant refetches and enables optimistic UI (instant action-item toggle).
- **Image optimization:** `next/image` for avatars/graphics (responsive, lazy, WebP/AVIF).
- **Skeletons** instead of spinners (reduce perceived layout shift); `prefers-reduced-motion` respected.
- **Bundle hygiene:** tree-shaking, no heavy client-only deps; Server Components by default.

## 6. Scaling levers

- Stateless API → horizontal scale behind a load balancer.
- Worker pool scales on **queue depth** (platform autoscaling).
- Read replicas + caching for read-heavy endpoints as load grows.
- Object storage (S3) is inherently elastic for media.

## 7. Measurement

- API latency by route (Prometheus metrics — Phase 17).
- DB slow-query log + Prisma timing.
- Frontend: Lighthouse CI + Core Web Vitals (RUM in Phase 17).
- Load tests (k6) before major releases.

---

*End of Phase 13 deliverable. Approval required before Phase 14 (Docker).*
