# AGENTS.md — HAY2010 Stock App

## Project

Next.js 16 App Router monolith. French-language ERP (stock, sales, purchases, partners, affairs).
Single package, single deployable. TypeScript strict mode.

## Commands

```bash
npm run dev                  # localhost:3000
npm run build                # prisma generate && next build
npm run lint                 # ESLint (flat config)
npm run lint:fix             # ESLint --fix
npx tsc --noEmit             # TypeScript check (no npm script — run directly)

# Testing
npm run test                 # vitest watch
npm run test:ci              # vitest run --coverage
npm run test:all             # vitest run (no coverage)
npx vitest run <path>        # single test file

# Database
npm run db:generate          # prisma generate
npm run db:push              # prisma db push (no migration files in dev)
npm run db:seed              # tsx prisma/seed.ts
npm run db:reset             # force-reset DB + reseed
```

Required order after schema change: `db:generate` → `build`. Fresh setup: `db:generate` → `db:push` → `db:seed`.

## Architecture

### Prisma Import
Import from `@/lib/generated/prisma/client` — **never** from `@prisma/client`.
Generated client outputs to `lib/generated/prisma/`.

Schema datasource URL in `prisma.config.ts` (not `schema.prisma`), loaded via dotenv.

### Key Directories

| Path | Purpose |
|------|---------|
| `app/(dashboard)/` | Authenticated routes (redirect to `/login` if unauthenticated) |
| `app/actions/` | Server Actions — all mutations live here, not API routes |
| `app/api/` | API routes: `health/`, `metrics/`, `csrf-token/`, `invoices/` |
| `lib/` | Core logic: auth, db, cache, queue, pdf, security, workers |
| `lib/generated/prisma/` | Prisma generated client — **do not edit** |
| `components/ui/` | shadcn/ui (style: `base-nova`, base color: `stone`, icons: hugeicons) |
| `components/erp/` | ERP-specific shared components |
| `prisma/schema.prisma` | Enums: `Role`, `TypePartenaire`; UUIDs for User PKs, autoincrement ints for others |

### Auth Flow
- Edge middleware (`middleware.ts`) validates JWT from `auth_token` cookie on every request
- User info propagated via request headers: `x-user-id`, `x-user-email`, `x-user-role`, `x-nonce`
- RBAC: `ADMIN > MANAGER > USER > VIEWER` (`/api/admin/*` requires ADMIN or MANAGER)
- CSP: nonce-based in production, `unsafe-inline` fallback when `SECURE_COOKIES=false` or in dev
- Rate limiting is per-route in API handlers (ioredis can't run in edge runtime)

### Path Aliases
- `@/*` → project root (tsconfig)
- `@app/*` → `app/` (vitest only, not in tsconfig)

## Prerequisites
- Node.js 20 (`.nvmrc`)
- PostgreSQL 16 + Redis 7 for dev server and integration tests
- `.env.local` from `.env.example`; requires `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET` (min 32 chars)
- Docker Compose for full local stack: `docker compose up -d`

## Testing
- Vitest + jsdom + `@testing-library/react`
- Setup: `src/__tests__/setup.ts` mocks `next/navigation`, `next/cache`, `@/lib/db/redis`
- **Redis is fully mocked** — no real Redis for unit tests
- Integration tests (`src/__tests__/integration/`) need real Postgres + Redis
- Test location mirrors `lib/` and `app/actions/` structure
- Coverage thresholds: lines 50%, functions 70%, branches 60%, statements 50%
- Coverage measured on `lib/**/*.ts` and `app/actions/**/*.ts`
- Coverage excludes: `db/`, `cache/`, `queue/`, `workers/`, `pdf/`, `config/`, `types/`, `middleware/`, `utils/client-logger.ts`

## Deployment
- Multi-stage Dockerfile: `base → deps → builder → runner`
- `docker-entrypoint.sh` runs `prisma migrate deploy` then starts `next start`
- Standalone output disabled on Windows (`next.config.ts`), works inside Docker (Linux)
- Docker build sets `SKIP_TYPE_CHECK=true` and `NODE_ENV=production`
- Health check: `GET /api/health/public`
- Production secrets: `_FILE` suffix variants (`DATABASE_URL_FILE`, etc.) for Docker Secrets
- Image pushed to GHCR, signed with Cosign, SBOM generated

## CI Pipeline
`lint → tsc --noEmit → test:ci → build` (plus prisma validate, prisma generate, Hadolint, Gitleaks, CodeQL)
Staging deploys from `develop`, production deploys from `main` (on release publish).

## Conventions
- Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- `@typescript-eslint/no-require-imports` is `off`
- Business domain uses French terms: `Partenaire`, `TypePartenaire`, `DocVente`, `Entrepot`, `MouvementStock`, `Affaire`
- `ignoreBuildErrors: true` in dev — type errors don't block dev builds, `tsc --noEmit` catches them
- Seed credentials: `admin@hay2010.com` / `Admin@2026`
