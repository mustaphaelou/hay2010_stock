# ============================================
# HAY2010 Stock Application - Dockerfile
# Version: 5.0
# ============================================
#
# MULTI-STAGE BUILD:
#   - base:     Common base image with system packages
#   - deps:     Node modules installation (cached)
#   - builder:  Application build + Prisma generation
#   - runner:   Production runtime (self-contained)
#
# SECURITY:
#   - Runs as non-root user (nextjs:1001)
#   - No secrets in image layers
#   - Minimal attack surface
#   - BuildKit cache mounts for fast rebuilds
#
# NOTE: Standalone output works inside Docker (Linux container)
# even when building on Windows host.
#
# ============================================

# ============================================
# BASE STAGE
# ============================================
FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS base

LABEL org.opencontainers.image.title="HAY2010 Stock Application"
LABEL org.opencontainers.image.description="Enterprise stock management system"
LABEL org.opencontainers.image.version="5.0.0"
LABEL org.opencontainers.image.vendor="HAY2010"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.base.name="node:20-alpine"

WORKDIR /app

# ============================================
# DEPS STAGE - Install Dependencies
# ============================================
FROM base AS deps

RUN apk add --no-cache \
    libc6-compat \
    openssl \
    && apk upgrade --no-cache

COPY package.json package-lock.json ./

RUN test -f package-lock.json || (echo "ERROR: package-lock.json required" && exit 1)

RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --prefer-offline --ignore-scripts

# ============================================
# BUILDER STAGE - Build Application
# ============================================
FROM base AS builder

RUN apk add --no-cache \
    openssl \
    && apk upgrade --no-cache

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate

ARG GIT_SHA=unknown
ARG BUILD_DATE=unknown
ARG PORT=3000

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV GIT_SHA=$GIT_SHA
ENV BUILD_DATE=$BUILD_DATE
ENV PORT=$PORT
ENV SKIP_TYPE_CHECK=true

RUN --mount=type=cache,target=/app/.next/cache,sharing=locked \
    npm run build

# Prune devDependencies after build
RUN npm prune --production

# Reinstall prisma CLI as production dep (needed for runtime migrations)
RUN npm install prisma --omit=dev --no-save

# Regenerate Prisma client after prune to ensure .prisma dir exists
RUN npx prisma generate

# ============================================
# RUNNER STAGE - Production Runtime
# ============================================
FROM base AS runner

RUN apk add --no-cache \
    curl \
    openssl \
    && apk upgrade --no-cache

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

ARG PORT=3000
ARG GIT_SHA=unknown
ARG BUILD_DATE=unknown

ENV PORT=$PORT
ENV HOSTNAME="0.0.0.0"
ENV GIT_SHA=$GIT_SHA
ENV BUILD_DATE=$BUILD_DATE

# Copy standalone Next.js server
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma files for runtime migrations
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/lib/generated/prisma ./lib/generated/prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts

# Copy production node_modules (pruned after build)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy package.json for prisma CLI resolution
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Copy entrypoint script
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./

USER root
RUN chmod +x ./docker-entrypoint.sh
USER nextjs

EXPOSE $PORT

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/health/public || exit 1

CMD ["./docker-entrypoint.sh"]
