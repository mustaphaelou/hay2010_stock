# AGENTS.md — HAY2010 Stock App

## Project Identity

Next.js 16 App Router monolith. Single package, single deployable.
Domain: French-language ERP/inventory management (stock, sales, purchases, partners, affairs).

## Commands

```bash
npm run dev                  # Start dev server (localhost:3000)
npm run build                # prisma generate && next build (includes generate)
npm run lint                 # ESLint (flat config, eslint.config.mjs)
npm run lint:fix             # ESLint with --fix
npx tsc --noEmit             # TypeScript check (no npm script — run directly)

# Testing
npm run test                 # vitest in watch mode
npm run test:ci              # vitest run --coverage (CI mode)
npm run test:all             # vitest run (no coverage)
npm run test:security        # single: middleware/security.test.ts
npm run test:errors          # single: lib/errors.test.ts
npm run test:metrics         # single: lib/monitoring/business-metrics.test.ts
npm run test:health          # single: api/health.test.ts
npx vitest run src/__tests__/lib/auth/jwt.test.ts  # run a single test file

# Database
npm run db:generate          # prisma generate (required before build if schema changed)
npm run db:push              # prisma db push (schema → DB, no migration files)
npm run db:seed              # tsx prisma/seed.ts (seeds admin + sample data)
npm run db:reset             # force-reset DB + reseed
npm run db:backup            # ./scripts/local-backup.sh
npm run db:restore           # ./scripts/local-restore.sh

# Docker helpers
npm run docker:psql          # psql shell into running postgres container
npm run docker:redis         # redis-cli into running redis container
npm run docker:seed          # run seed inside container
npm run docker:migrate       # run migrate service in container
npm run docker:health        # curl /api/health/public
```

## Required Command Order

1. After any `prisma/schema.prisma` change: `npm run db:generate` before `npm run build`
2. CI pipeline order: `lint → tsc --noEmit → test:ci → build`
3. Fresh setup order: `db:generate → db:push → db:seed`

## Prerequisites

- **Node.js 20** (pinned in `.nvmrc`)
- **PostgreSQL 16** + **Redis 7** must be running for dev server and integration tests
- `.env.local` required (copy from `.env.example`); must set `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET` (min 32 chars)
- Docker Compose available for full local stack: `docker compose up -d`

## Architecture

### Path Aliases

- `@/*` → project root (tsconfig paths)
- `@app/*` → `app/` (**vitest alias only**, not in tsconfig)

### Prisma Import

Always import from `@/lib/generated/prisma/client` — **never** from `@prisma/client` directly.
Generated client outputs to `lib/generated/prisma/` (not `node_modules`).

### Key Directories

| Path | Purpose |
|------|---------|
| `app/` | Next.js App Router pages and layouts |
| `app/(dashboard)/` | Authenticated routes (layout redirects to `/login` if unauthenticated) |
| `app/actions/` | Next.js Server Actions (all mutations go here — not API routes) |
| `app/api/` | API routes: `health/`, `metrics/`, `csrf-token/`, `invoices/` |
| `lib/` | Core business logic (auth, db, cache, queue, pdf, security, middleware, workers) |
| `lib/generated/prisma/` | Prisma generated client output — **do not edit** |
| `lib/db/prisma.ts` | Prisma singleton (uses `@prisma/adapter-pg` with pg Pool, global-cached in dev) |
| `lib/db/redis.ts` | Two Redis singletons: `redis` (cache/rate-limit) + `redisSession` (sessions); supports cluster via `REDIS_CLUSTER_NODES` |
| `components/ui/` | shadcn/ui components (style: `base-nova`, base color: `stone`, icons: `hugeicons`) |
| `components/erp/` | ERP-specific shared components |
| `prisma/schema.prisma` | DB schema (PostgreSQL; enums: `Role`, `TypePartenaire`; UUIDs for User PKs, autoincrement ints for others) |

### Auth Flow

- Edge middleware (`middleware.ts`) validates JWT from `auth_token` cookie on every request
- User info propagated via request headers: `x-user-id`, `x-user-email`, `x-user-role`, `x-nonce`
- RBAC: `ADMIN > MANAGER > USER > VIEWER` (`/api/admin/*` requires ADMIN or MANAGER)
- CSP uses nonce-based headers in production, `unsafe-inline` fallback when `SECURE_COOKIES=false` or in dev
- Rate limiting is per-route in API handlers (not in edge middleware — ioredis can't run in edge runtime)

### Data Flow

- **Server Actions** (`app/actions/*.ts`) are the primary mutation layer — not API routes
- **Prisma** with `@prisma/adapter-pg` (pg adapter, not default Prisma pooling)
- **Redis** used for: sessions, caching (versioned keys), rate limiting (sliding window), job queues (BullMQ), distributed locks

## Prisma Quirks

- Schema datasource URL configured in `prisma.config.ts` (not in `schema.prisma`), which loads `.env` and `.env.local` via dotenv
- No migration files in active use — schema applied via `prisma db push` locally, `prisma migrate deploy` in Docker entrypoint
- `prisma/migrations_backup/` is historical only
- `prisma validate` and `prisma generate` must succeed before build

## Testing

- **Framework**: Vitest with jsdom environment, `@testing-library/react`
- **Setup**: `src/__tests__/setup.ts` mocks `next/navigation`, `next/cache`, and `@/lib/db/redis`
- **Test location**: `src/__tests__/` (mirrors `lib/` and `app/actions/` structure)
- **Redis is fully mocked** in tests — no real Redis needed for unit tests
- **Integration tests** (`src/__tests__/integration/`) need real Postgres + Redis (CI provides service containers)
- Coverage thresholds: lines 50%, functions 70%, branches 60%, statements 50%
- Coverage only measured on `lib/**/*.ts` and `app/actions/**/*.ts`
- **Coverage excludes** these `lib/` subdirectories: `db/`, `cache/`, `queue/`, `workers/`, `pdf/`, `config/`, `types/`, `middleware/`, `utils/client-logger.ts`
- ESLint also ignores `lib/generated/**` and `src/__tests__/setup.ts`

## Environment & Secrets

- Production supports Docker Secrets: `_FILE` suffix variants (`DATABASE_URL_FILE`, `JWT_SECRET_FILE`, `REDIS_PASSWORD_FILE`)
- `JWT_SECRET` minimum 32 characters (enforced in `lib/config/env-validation.ts`)
- Docker dev defaults: `SECURE_COOKIES=false`, `LOCKOUT_FAIL_CLOSED=false`, `RATE_LIMIT_FAIL_CLOSED=false`
- Seed credentials: `admin@hay2010.com` / `Admin@2026` (override via `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` in `.env.local`)

## Docker

- Multi-stage Dockerfile: `base → deps → builder → runner` (no `migrator` target — migrations run in entrypoint)
- `docker-compose.yml` runs app with Postgres + Redis; migrations + seed are manual steps
- `docker-entrypoint.sh` runs `prisma migrate deploy` then starts `node server.js`
- Production compose: `docker-compose.prod.yml`
- Health check: `GET /api/health/public` (not `/api/health`)
- Standalone output disabled on Windows host (`process.platform !== 'win32'` check in `next.config.ts`), but works inside Docker container (Linux)
- Docker build sets `SKIP_TYPE_CHECK=true` and `NODE_ENV=production`

## CI/CD (`.github/workflows/ci-cd.yml`)

Stages: quality-checks → [test, security-scan, migration-check] → security-validation → build → [deploy-staging, deploy-production]
- Staging deploys from `develop`, production deploys from `main` (on release publish)
- Test job uses GitHub Actions service containers (Postgres 16, Redis 7)
- `tsc --noEmit` is run in CI but not as an npm script — run it directly

## Conventions

- Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- TypeScript strict mode enabled
- `@typescript-eslint/no-require-imports` is `off` — require() allowed
- Business domain uses French terms in code: `Partenaire`, `TypePartenaire`, `DocVente`, `Entrepot`, `MouvementStock`, `Affaire`
- `ignoreBuildErrors: true` in dev (`next.config.ts`) — type errors don't block dev builds, but `tsc --noEmit` catches them in CI
