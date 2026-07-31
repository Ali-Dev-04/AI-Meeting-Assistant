# Deployment Guide

| Field     | Value                              |
|-----------|------------------------------------|
| Version   | 1.0                                |
| Status    | Phase 16 — Draft, pending approval |
| Date      | 2026-07-23                         |
| Phase     | 16 of 18 — Deployment              |

## 1. Topology

| Component | What runs it |
|-----------|--------------|
| **Web** (Next.js) | Vercel (or static + CDN) |
| **API** (NestJS) | Container platform (Railway / Render / ECS Fargate) |
| **Worker** (NestJS) | Same image as API, different command; scales on queue depth |
| **PostgreSQL + pgvector** | Managed (Neon / Render / RDS) |
| **Redis** | Managed (Upstash / ElastiCache) |
| **Object storage** | S3 (MinIO locally) |
| **STT / embeddings** | Self-hosted containers (GPU optional) or managed APIs |

## 2. Recommendation

> **Start on Railway/Render; move to AWS when scale/compliance demands it.**

- **Railway/Render** give you containers + managed Postgres/Redis in a few clicks, preview envs per
  PR, and trivial deploys — ideal for v1 velocity and a small team.
- **AWS (ECS Fargate + RDS + ElastiCache + S3)** is the "serious" production path: VPC isolation,
  IAM, autoscaling, compliance posture. Worth the operational cost only once you have traffic,
  SLAs, or certification requirements.

| | Railway/Render | AWS ECS Fargate | Vercel (web only) |
|---|---|---|---|
| Time to deploy | minutes | hours/days | minutes |
| Ops burden | very low | moderate-high | very low (web) |
| Cost at small scale | low | higher baseline | free tier |
| Scale ceiling | mid | very high | very high (web) |
| Compliance/lock-in | some | strong / low | some |

## 3. Option A — Railway / Render (recommended start)

1. **Web → Vercel:** connect the repo, root `apps/web`, build `pnpm --filter @ama/web build`,
   output standalone. Set `NEXT_PUBLIC_API_URL`.
2. **API + Worker → Railway/Render:** deploy the `docker/Dockerfile.app` image. Create two services
   from the same image: API (default CMD) and Worker (command `node apps/api/dist/worker.js`).
3. **Backing services:** add managed Postgres (ensure the `pgvector` extension is available — Neon
   and Render Postgres support it), managed Redis, and an S3 bucket.
4. **Environment:** set every var from `.env.example` in the dashboard (never commit secrets).
   Run migrations once: `pnpm --filter @ama/api prisma migrate deploy` (or a one-off deploy hook).
5. Add the HNSW + tsvector raw migration (`docs/database.md` §6–7) before enabling search/chat.

## 4. Option B — AWS (scale path)

- **Web:** Vercel or AWS Amplify Hosting.
- **API + Worker:** ECS on Fargate; worker as a separate service with autoscaling on
  `ApproximateNumberOfMessagesVisible` (map to BullMQ queue depth in Redis).
- **DB:** RDS PostgreSQL (enable `pgvector`; read replicas as load grows).
- **Redis:** ElastiCache (or Upstash for serverless).
- **Storage:** S3 + CloudFront for any public assets.
- **Secrets:** AWS Secrets Manager / SSM Parameter Store (not env files).
- **Networking:** private subnets; API behind an ALB; DB/Redis private only.
- **CI:** the `docker-images.yml` workflow pushes to ECR; a deploy step updates the ECS service.

## 5. CI/CD to deploy

`docker-images.yml` builds & pushes `api` and `web` images to GHCR on `main` and version tags. A
target-specific deploy step (Railway CLI / `aws ecs update-service`) consumes the new tag. Keep
deploys **atomic per service** and **rollback-friendly** (previous image tag retained).

## 6. Pre-deploy checklist

- [ ] Required env vars set (boots fail-fast otherwise)
- [ ] Migrations applied (`prisma migrate deploy`) + HNSW/tsvector raw migration
- [ ] MinIO/S3 bucket created
- [ ] CORS origins include the deployed web URL
- [ ] Health checks green (`/api/v1/health/ready`)
- [ ] Sentry DSN + observability wired (Phase 17)
- [ ] Quota/Stripe configured (or intentionally disabled)

## 7. Rollback

Each deploy keeps the prior image tag; rollback = redeploy the previous tag + reverse migrations
(if any were forward-only, apply the compensating migration). Trunk-based + small deploys keep
rollbacks trivial.

---

*End of Phase 16 deliverable.*
