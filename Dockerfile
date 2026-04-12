# syntax=docker/dockerfile:1.4
# ============================================
# HAY2010 Stock Application - Production Dockerfile
# Version: 3.0
# Last Updated: 2026-04-05
# Security: Hardened with digest pinning, healthcheck, minimal packages
# ============================================
# IMPORTANT: The `runner` stage MUST be the LAST stage in this file.
# Coolify and other CI systems that run `docker build` without `--target`
# will build the last stage by default. If `migrator` is last, the
# resulting image has no HEALTHCHECK and deployments will fail.
# ============================================

# Stage 1: Install dependencies
# node:20-alpine (tracking)
FROM node:20-alpine@sha256:f598378b5240225e6beab68fa9f356db1fb8efe55173e6d4d8153113bb8f333c AS deps
WORKDIR /app

# Install build dependencies with pinned versions
RUN apk add --no-cache openssl libc6-compat

COPY package.json package-lock.json ./

# Verify lock file exists
RUN test -f package-lock.json || (echo "package-lock.json required" && exit 1)

# Run security audit (warn only, don't fail build)
RUN npm audit --audit-level=high || true

# Mount cache for npm (BuildKit enabled)
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline

# Stage 2: Build the application
# node:20-alpine (tracking)
FROM node:20-alpine@sha256:f598378b5240225e6beab68fa9f356db1fb8efe55173e6d4d8153113bb8f333c AS builder
WORKDIR /app

# Build the application with dummy database URL (will be replaced at runtime)
ARG DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy?connection_limit=1"

# Install OpenSSL for Prisma with pinned version
RUN apk add --no-cache openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client (prisma.config.ts is needed for Prisma 7.x)
RUN npx prisma generate && \
    rm -rf node_modules/.prisma/client/runtime/query_engine-*.*.so || true && \
    rm -rf node_modules/@prisma/client/runtime/query_engine-*.*.so || true

# Build the application with dummy database URL (will be replaced at runtime)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV DATABASE_URL=${DATABASE_URL}

# Mount cache for Next.js build (BuildKit enabled)
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

# Stage 3: Migration runner (MINIMAL - for running migrations separately)
# NOTE: This stage is intentionally BEFORE the runner stage.
# Optimized to avoid copying full node_modules from deps stage.
# node:20-alpine (tracking)
FROM node:20-alpine@sha256:f598378b5240225e6beab68fa9f356db1fb8efe55173e6d4d8153113bb8f333c AS migrator
WORKDIR /app

# Install OpenSSL for Prisma query engine
RUN apk add --no-cache openssl

# Set up non-root user FIRST (before COPY and chown operations)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 migrator

# Copy Prisma schema files only - no source code needed
COPY --chown=migrator:nodejs prisma ./prisma
COPY --chown=migrator:nodejs prisma.config.ts ./

# Install ONLY Prisma packages needed for migrate deploy (minimal footprint)
RUN npm install --omit=dev --no-optional \
    prisma@7.4.2 \
    @prisma/client@7.4.2 \
    && npm cache clean --force \
    && chown -R migrator:nodejs /app

USER migrator

# Default command runs migrations with explicit database URL
# The DATABASE_URL should be passed via environment variable
CMD ["sh", "-c", "npx prisma migrate deploy"]

# Stage 4: Runner (MUST be the LAST stage - default build target)
# node:20-alpine (tracking)
FROM node:20-alpine@sha256:f598378b5240225e6beab68fa9f356db1fb8efe55173e6d4d8153113bb8f333c AS runner
WORKDIR /app

# Install runtime dependencies (curl for healthcheck, netcat for db connectivity check)
RUN apk add --no-cache curl netcat-openbsd

# OCI Image Labels
LABEL org.opencontainers.image.title="HAY2010 Stock Application" \
      org.opencontainers.image.description="Enterprise stock management system for HAY2010" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.revision="${GIT_SHA:-unknown}" \
      org.opencontainers.image.created="${BUILD_DATE:-unknown}" \
      org.opencontainers.image.authors="HAY2010 Team" \
      org.opencontainers.image.vendor="HAY2010" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.url="https://github.com/hay2010/stock-app" \
      org.opencontainers.image.source="https://github.com/hay2010/stock-app" \
      org.opencontainers.image.documentation="https://docs.hay2010.com" \
      org.opencontainers.image.base.name="node:20-alpine"

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user (Alpine style)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy only production artifacts
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma generated client for runtime
COPY --from=builder --chown=nextjs:nodejs /app/lib/generated/prisma ./lib/generated/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Copy entrypoint script
COPY --chown=nextjs:nodejs docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

USER nextjs

# Parameterized port
ARG PORT=3000
ENV PORT=${PORT}
ENV HOSTNAME="0.0.0.0"

EXPOSE ${PORT}

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/health || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]
