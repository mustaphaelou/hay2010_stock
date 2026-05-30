FROM node:20-alpine AS base
RUN apk add --no-cache libcrypto3 openssl
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
ARG JWT_SECRET
ENV JWT_SECRET=$JWT_SECRET
COPY package.json package-lock.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV STANDALONE_BUILD=true
RUN npx prisma generate && npm run build

FROM builder AS migrator
ENV NODE_ENV=production
ENTRYPOINT []

FROM base AS runner
RUN apk add --no-cache ca-certificates curl
ENV NODE_ENV=production
ENV STANDALONE_BUILD=true
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/lib/generated ./lib/generated

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "server.js"]
