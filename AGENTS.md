# AGENTS.md — HAY2010 Stock App

## Project Identity

Next.js 16 App Router monolith (not a monorepo). Single package, single deployable.
Domain: French-language ERP/inventory management (stock, sales, purchases, partners, affairs).

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # prisma generate && next build (build script includes generate)
npm run lint         # ESLint (flat config, eslint.config.mjs)
npx tsc --noEmit     # TypeScript check (not a separate npm script — CI runs this directly)
npm run test         # vitest in watch mode
npm run test:ci      # vitest run --coverage (CI mode, single invocation runs all tests)
npx vitest run src/__tests__/lib/auth/jwt.test.ts  # Run a single test file
npm run db:generate  # prisma generate (required before build if schema changed)
npm run db:push      # prisma db push (schema → DB, no migration files)
npm run db:seed      # tsx prisma/seed.ts (seeds admin + sample data)
npm run db:reset     # force-reset DB + reseed
```

## Required Command Order

1. After any `prisma/schema.prisma` change: `npm run db:generate` before `npm run build`
2. CI pipeline order: `lint → tsc --noEmit → test:ci → build`

## Prerequisites

- **Node.js 20** (pinned in `.nvmrc`)
- **PostgreSQL 16** + **Redis 7** must be running for dev server and integration tests
- `.env.local` required (copy from `.env.example`); must set `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`
- Docker Compose available for full local stack: `docker compose up -d`

## Architecture

### Path Aliases

- `@/*` → project root (tsconfig paths)
- `@app/*` → `app/` (vitest alias only)
- Import Prisma client from `@/lib/generated/prisma/client` (not `@prisma/client` directly)

### Key Directories

| Path | Purpose |
|------|---------|
| `app/` | Next.js App Router pages and layouts |
| `app/(dashboard)/` | Authenticated routes (layout calls `getCurrentUser`, redirects to `/login` if unauthenticated) |
| `app/actions/` | Next.js Server Actions (all mutations go here) |
| `app/api/` | API routes: `health/`, `metrics/`, `csrf-token/`, `invoices/` |
| `lib/` | Core business logic (auth, db, cache, queue, pdf, security, middleware, workers) |
| `lib/generated/prisma/` | Prisma generated client output (schema.prisma `output = "../lib/generated/prisma"`) |
| `lib/db/prisma.ts` | Prisma singleton (uses `@prisma/adapter-pg` with pg Pool, global-cached in dev) |
| `lib/db/redis.ts` | Redis singleton (ioredis; supports cluster via `REDIS_CLUSTER_NODES`) |
| `components/ui/` | shadcn/ui components (style: `base-nova`, base color: `stone`, icons: `hugeicons`) |
| `prisma/schema.prisma` | DB schema (PostgreSQL; enums: `Role`, `TypePartenaire`; UUIDs for primary keys) |

### Auth Flow

- Edge middleware (`middleware.ts`) validates JWT from `auth_token` cookie on every request
- User info propagated via request headers: `x-user-id`, `x-user-email`, `x-user-role`
- RBAC: `ADMIN > MANAGER > USER > VIEWER` (`/api/admin/*` requires ADMIN or MANAGER)
- CSP uses nonce-based headers in production, `unsafe-inline` fallback when `SECURE_COOKIES=false` or in dev

### Data Flow

- **Server Actions** (`app/actions/*.ts`) are the primary mutation layer — not API routes
- **Prisma** with `@prisma/adapter-pg` (pg adapter, not default Prisma pooling)
- **Redis** used for: sessions, caching (versioned keys), rate limiting (sliding window), job queues (BullMQ)

## Prisma Quirks

- Schema datasource URL is configured in `prisma.config.ts` (not in `schema.prisma`), which loads `.env` and `.env.local` via dotenv
- Generated client outputs to `lib/generated/prisma/` (not default `node_modules`) — always import from `@/lib/generated/prisma/client`
- No migration files in active use — schema applied via `prisma db push` (`prisma/migrations_backup/` is historical)
- `prisma validate` and `prisma generate` must succeed before build

## Testing

- **Framework**: Vitest with jsdom environment, `@testing-library/react`
- **Setup**: `src/__tests__/setup.ts` mocks `next/navigation`, `next/cache`, and `@/lib/db/redis`
- **Test location**: `src/__tests__/` (mirrors `lib/` and `app/actions/` structure)
- **Redis is fully mocked** in tests — no real Redis needed for unit tests
- **Integration tests** (`src/__tests__/integration/`) need real Postgres + Redis (CI provides service containers)
- Coverage thresholds: lines 50%, functions 70%, branches 60%, statements 50%
- Coverage only measured on `lib/**/*.ts` and `app/actions/**/*.ts`

## shadcn/ui

- Config: `components.json` — style `base-nova`, RSC enabled, base color `stone`, icon library `hugeicons`
- Add components via: `npx shadcn add <component>`
- UI components live in `components/ui/`
- ERP-specific shared components in `components/erp/`

## Docker

- Multi-stage Dockerfile with `migrator` and `runner` targets
- `docker-compose.yml` runs migrate → seed (manual) → app, with Postgres + Redis
- Admin seed credentials: `admin@hay2010.com` / `Admin@2026` (overridable via `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`)
- Production compose: `docker-compose.prod.yml`
- App health check: `GET /api/health/public`
- Standalone output disabled on Windows (`process.platform !== 'win32'` check in `next.config.ts`)

## CI/CD (`.github/workflows/ci-cd.yml`)

Stages: quality-checks → [test, security-scan, migration-check] → security-validation → build → [deploy-staging, deploy-production]
- Deploy to staging on push to `main`/`develop`; deploy to production on release publish
- Test job uses GitHub Actions service containers (Postgres 16, Redis 7)
- `tsc --noEmit` is run in CI but not as an npm script — run it directly

## Conventions

- Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- TypeScript strict mode enabled
- Business domain uses French terms in code: `Partenaire`, `TypePartenaire`, `DocVente`, `Entrepot`, `MouvementStock`, `Affaire`
- `SECURE_COOKIES=false` and `LOCKOUT_FAIL_CLOSED=false` in Docker dev (circuit breakers open)
