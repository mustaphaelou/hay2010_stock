# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./

# Use npm ci for faster, reproducible builds
RUN npm ci --prefer-offline --no-audit

# Stage 2: Build the application
FROM node:20-alpine AS builder
WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client (prisma.config.ts is needed for Prisma 7.x)
RUN npx prisma generate

# Build the application with dummy database URL (will be replaced at runtime)
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy?connection_limit=1"
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

# Install runtime dependencies (netcat-openbsd for database health check)
RUN apk add --no-cache openssl curl netcat-openbsd

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

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Stage 4: Migration runner (for running migrations separately)
FROM node:20-alpine AS migrator
WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Copy package files and install all dependencies (including devDependencies for prisma CLI)
COPY package*.json ./
RUN npm ci --prefer-offline --no-audit

# Copy prisma schema and generate client
COPY prisma ./prisma
COPY prisma.config.ts ./

# Copy migrations
COPY prisma/migrations ./prisma/migrations

# Generate Prisma client (requires prisma.config.ts for Prisma 7.x)
RUN npx prisma generate

# Set up non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 migrator && \
    chown -R migrator:nodejs /app

USER migrator

# Default command runs migrations with explicit database URL
# The DATABASE_URL should be passed via environment variable
CMD ["sh", "-c", "npx prisma migrate deploy"]
