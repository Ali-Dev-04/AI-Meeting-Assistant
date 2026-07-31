# Multi-stage build for the NestJS API and worker (same image, different CMD).
FROM node:20-bookworm-slim AS builder
WORKDIR /app
RUN corepack enable

# Install deps first (cached layer).
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared-types/package.json ./packages/shared-types/
RUN pnpm install --frozen-lockfile

COPY apps/api ./apps/api
COPY packages/shared-types ./packages/shared-types

# Generate the Prisma client, then compile.
RUN pnpm --filter @ama/api prisma:generate
RUN pnpm --filter @ama/api build

# --- runtime: lean image, prod deps only ---
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared-types/package.json ./packages/shared-types/
RUN pnpm install --frozen-lockfile --prod

# Built code + schema + generated Prisma client.
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/node_modules/.prisma ./apps/api/node_modules/.prisma

EXPOSE 4000
# Default = API; the worker overrides CMD in docker-compose.
CMD ["node", "apps/api/dist/main.js"]
