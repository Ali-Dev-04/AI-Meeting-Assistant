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
COPY tsconfig.base.json ./

# API resolves @ama/shared-types from its compiled dist (CommonJS) — build it first.
RUN pnpm --filter @ama/shared-types build

# Generate the Prisma client, then compile.
RUN pnpm --filter @ama/api prisma:generate
RUN pnpm --filter @ama/api build

# --- runtime ---
# Copy the builder's node_modules verbatim (pnpm store + symlinks) so the generated
# Prisma client, bcrypt native binding, and shared-types dist all resolve at runtime.
# (A separate --prod reinstall breaks on pnpm's virtual-store layout + husky's prepare.)
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/packages/shared-types ./packages/shared-types

# Built API + Prisma schema.
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

EXPOSE 4000
# Default = API; the worker overrides CMD in docker-compose.
CMD ["node", "apps/api/dist/main.js"]
