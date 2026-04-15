FROM node:20.18-alpine3.21 AS base

# 1. Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# 2. Rebuild the source code
FROM base AS builder
WORKDIR /app

# Accept build-time metadata
ARG GIT_SHA=unknown
ARG BUILD_DATE=unknown

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client & Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
ENV GIT_SHA=$GIT_SHA
ENV BUILD_DATE=$BUILD_DATE
RUN npx prisma generate && npm run build

# 3. Migration runner (used by docker-compose 'migrate' service)
FROM base AS migrator
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY prisma ./prisma
RUN npx prisma generate
ENTRYPOINT ["npx", "prisma", "migrate", "deploy"]

# 4. Production runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install runtime dependencies and set up non-root user in a single layer
RUN apk add --no-cache netcat-openbsd curl openssl \
    && addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Copy essential files
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Let the entrypoint script start the server
CMD ["./docker-entrypoint.sh"]
