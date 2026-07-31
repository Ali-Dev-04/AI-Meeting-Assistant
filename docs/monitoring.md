# Monitoring & Observability

| Field     | Value                              |
|-----------|------------------------------------|
| Version   | 1.0                                |
| Status    | Phase 17 — Draft, pending approval |
| Date      | 2026-07-23                         |
| Phase     | 17 of 18 — Monitoring              |

The three pillars — **logs, metrics, traces** — plus error tracking, health, uptime, and product
analytics.

| Pillar | Tool | Status |
|--------|------|--------|
| Logging | Nest `Logger` (structured JSON via `@nestjs/pino` in prod) | request-id correlation in place |
| Metrics | `prom-client` + Prometheus → Grafana | scrape endpoint + dashboards |
| Error tracking | **Sentry** (wired, DSN-gated) | captures unhandled errors w/ release |
| Tracing | OpenTelemetry | vendor-neutral; ship to Jaeger/Honeycomb |
| Health | `/api/v1/health` + `/ready` (DB + Redis) | implemented |
| Uptime | external probe (Better Stack / UptimeRobot) | black-box |
| Product analytics | PostHog | funnels, session replay, flags |

---

## 1. Logging
- One line per request (`LoggingInterceptor`: `METHOD url duration`), tagged with the
  `X-Request-Id` set by `RequestIdMiddleware`. Every error envelope echoes the same id →
  support can trace a user's failure to the exact log line.
- Production target: **structured JSON** (`@nestjs/pino`) shipped to a log aggregator. Never log
  secrets/PII (the env validator + this guide are the guardrails).

## 2. Error tracking — Sentry
- Initialized in both `main.ts` and `worker.ts` when `SENTRY_DSN` is set (no-op in dev otherwise),
  with `environment` and `tracesSampleRate`. Release tracking ties errors to a deploy.
- The global `HttpExceptionFilter` logs 5xxs; unexpected throws propagate to Sentry automatically.

## 3. Metrics
- Expose `/metrics` (Prometheus text format) via `prom-client`. Track: request count/latency by
  route, job throughput + failure rate (BullMQ), queue depth, DB pool usage, AI call count/latency.
- Grafana dashboards: API overview, worker/pipeline health, AI cost & latency.

## 4. Tracing (OpenTelemetry)
- Instrument HTTP, Prisma, Redis, BullMQ, and outbound AI (Anthropic/Whisper/embeddings) calls.
- A single trace follows a request (and, for chat, the SSE span) across services → find where the
  300ms went.

## 5. Health & readiness
- `GET /health` = liveness (process up). `GET /health/ready` = readiness (DB + Redis reachable,
  503 if degraded). Platform uses these for routing/restarts.

## 6. Uptime
- External probes (Better Stack/UptimeRobot) check `/health/ready` from outside the VPC — you can't
- alert on a metric your monitoring can't reach. Page on-call on sustained failure.

## 7. Alerting
- **Error spike** (Sentry), **5xx rate / latency SLO burn** (metrics), **queue backlog** (worker
  depth > threshold), **health degraded**, **AI provider errors** rising.
- Page for user-impacting issues; lower-priority to Slack/email.

## 8. Product analytics (PostHog)
- Track signup, upload, processing-complete, search, chat, upgrade funnels (PRD OKRs). Feature flags
  decouple deploy from release. Self-hostable for data-residency.

---

*End of Phase 17 deliverable.*
