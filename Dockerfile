# ============================================
# HAY2010 Stock Application - Production Dockerfile
# Version: 3.0 (Unified)
# ============================================
# Optimized for stability with:
# - Pinned base image digests for reproducibility
# - BuildKit cache mounts for faster rebuilds
# - Docker Secrets support for secure configuration
# - Minimal attack surface with security hardening
# ============================================

# Base image with digest pinning
FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS base

# =====================================================
# Stage 1: Dependencies
# =====================================================
FROM base AS deps
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache libc6-compat openssl && \
    apk upgrade --no-cache

# Copy package files
COPY package.json package-lock.json ./

# Verify lock file exists for reproducible builds
RUN test -f package-lock.json || (echo "ERROR: package-lock.json required for reproducible builds" && exit 1)

# Install dependencies with BuildKit cache mount
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --prefer-offline --ignore-scripts

# =====================================================
# Stage 2: Builder
# =====================================================
FROM base AS builder
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache openssl && \
    apk upgrade --no-cache

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build arguments for metadata
ARG GIT_SHA=unknown
ARG BUILD_DATE=unknown
ARG PORT=3000

# Set build-time environment
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV GIT_SHA=$GIT_SHA
ENV BUILD_DATE=$BUILD_DATE
ENV PORT=$PORT

# Build Next.js application with BuildKit cache
RUN --mount=type=cache,target=/app/.next/cache,sharing=locked \
    npm run build

# =====================================================
# Stage 3: Migration Runner
# =====================================================
FROM base AS migrator
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache openssl curl && \
    apk upgrade --no-cache

# Copy node_modules and prisma from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/lib/generated/prisma ./lib/generated/prisma

# Set up non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 migrator && \
    chown -R migrator:nodejs /app

USER migrator

# Entrypoint for migrations
ENTRYPOINT ["npx", "prisma", "migrate", "deploy"]

# =====================================================
# Stage 4: Production Runner
# =====================================================
FROM base AS runner
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache curl netcat-openbsd openssl && \
    apk upgrade --no-cache

# OCI Image Labels
LABEL org.opencontainers.image.title="HAY2010 Stock Application" \
      org.opencontainers.image.description="Enterprise stock management system" \
      org.opencontainers.image.version="3.0.0" \
      org.opencontainers.image.vendor="HAY2010" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.base.name="node:20-alpine"

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

# Copy production files
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
    CMD curl -f http://localhost:${PORT}/api/health || exit 1

# Start application
CMD ["./docker-entrypoint.sh"]
