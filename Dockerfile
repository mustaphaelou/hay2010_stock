# ============================================
# HAY2010 Stock Application - Dockerfile
# Version: 4.0
# ============================================
#
# PURPOSE:
# Optimized for local Docker deployment without Docker secrets
# Uses environment variables directly for simplicity
#
# MULTI-STAGE BUILD:
# - base: Common base image and tools
# - deps: Node modules installation
# - builder: Application build
# - migrator: Database migration runner + seeder
# - runner: Production runtime
#
# SECURITY:
# - Runs as non-root user (nextjs:1001)
# - Minimal attack surface
# - Read-only root filesystem (where possible)
# - No external network calls at runtime
#
# NOTE: Standalone output works correctly inside Docker (Linux container)
# even when building on Windows host. No changes needed for Windows.
#
# ============================================
#
# PURPOSE:
#   Optimized for local Docker deployment without Docker secrets
#   Uses environment variables directly for simplicity
#
# MULTI-STAGE BUILD:
#   - base: Common base image and tools
#   - deps: Node modules installation
#   - builder: Application build
#   - migrator: Database migration runner
#   - runner: Production runtime
#
# SECURITY:
#   - Runs as non-root user (nextjs:1001)
#   - Minimal attack surface
#   - Read-only root filesystem (where possible)
#   - No external network calls at runtime
#
# ============================================

# ============================================
# BASE STAGE
# ============================================
FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS base

# Labels
LABEL org.opencontainers.image.title="HAY2010 Stock Application"
LABEL org.opencontainers.image.description="Enterprise stock management system - Local Docker"
LABEL org.opencontainers.image.version="3.0.0"
LABEL org.opencontainers.image.vendor="HAY2010"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.base.name="node:20-alpine"

WORKDIR /app

# ============================================
# DEPS STAGE - Install Dependencies
# ============================================
FROM base AS deps

# Install build dependencies
RUN apk add --no-cache \
    libc6-compat \
    openssl \
    && apk upgrade --no-cache

# Copy package files
COPY package.json package-lock.json ./

# Verify lock file exists
RUN test -f package-lock.json || (echo "ERROR: package-lock.json required" && exit 1)

# Install dependencies with BuildKit cache for faster rebuilds
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --prefer-offline --ignore-scripts

# ============================================
# BUILDER STAGE - Build Application
# ============================================
FROM base AS builder

# Install build dependencies
RUN apk add --no-cache \
    openssl \
    && apk upgrade --no-cache

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build arguments
ARG GIT_SHA=unknown
ARG BUILD_DATE=unknown
ARG PORT=3000
ARG DATABASE_URL=postgresql://postgres:postgres@postgres:5432/hay2010_db?connection_limit=5&pool_timeout=10

# Build-time environment
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV GIT_SHA=$GIT_SHA
ENV BUILD_DATE=$BUILD_DATE
ENV PORT=$PORT
ENV DATABASE_URL=$DATABASE_URL

# Build Next.js application with BuildKit cache
RUN --mount=type=cache,target=/app/.next/cache,sharing=locked \
    npm run build

# ============================================
# MIGRATOR STAGE - Database Migrations & Seeding
# ============================================
FROM base AS migrator

# Install runtime dependencies
RUN apk add --no-cache \
openssl \
curl \
postgresql-client \
&& apk upgrade --no-cache

# Install tsx globally for running TypeScript seed script
RUN npm install -g tsx

# Copy node_modules and prisma from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/lib/generated/prisma ./lib/generated/prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/package.json ./package.json

# Copy seed script for seeding support
COPY --from=builder /app/prisma/seed.ts ./prisma/seed.ts

# Set up non-root user
RUN addgroup --system --gid 1001 nodejs && \
adduser --system --uid 1001 migrator && \
chown -R migrator:nodejs /app

USER migrator

# Default: run migrations. Override with command for seeding.
CMD ["npx", "prisma", "migrate", "deploy"]

# ============================================
# RUNNER STAGE - Production Runtime
# ============================================
FROM base AS runner

# Install runtime dependencies
RUN apk add --no-cache \
    curl \
    netcat-openbsd \
    openssl \
    && apk upgrade --no-cache

# Set up non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build arguments
ARG PORT=3000
ARG GIT_SHA=unknown
ARG BUILD_DATE=unknown

# Environment configuration
ENV PORT=$PORT
ENV HOSTNAME="0.0.0.0"
ENV GIT_SHA=$GIT_SHA
ENV BUILD_DATE=$BUILD_DATE

# Copy production files from builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma files for runtime
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/lib/generated/prisma ./lib/generated/prisma

# Copy entrypoint script
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./

# Make entrypoint executable
USER root
RUN chmod +x ./docker-entrypoint.sh
USER nextjs

# Expose port
EXPOSE $PORT

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
CMD curl -f http://localhost:${PORT}/api/health/public || exit 1

# Start application
CMD ["./docker-entrypoint.sh"]