# HAY2010 Stock Application - Dependencies Documentation

**Version:** 1.0.0
**Last Updated:** 2026-04-17
**Environment:** Docker-based Local Deployment

---

## Table of Contents

1. [Overview](#overview)
2. [Runtime Dependencies](#runtime-dependencies)
3. [Development Dependencies](#development-dependencies)
4. [System Dependencies](#system-dependencies)
5. [Base Docker Images](#base-docker-images)
6. [External Services](#external-services)
7. [Dependency Graph](#dependency-graph)
8. [Security Considerations](#security-considerations)

---

## Overview

This document comprehensively catalogs all dependencies required by the HAY2010 Stock Application. The application is designed to run entirely within Docker containers with no reliance on external package managers or cloud services for core functionality.

### Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    HAY2010 Stock App                         │
├─────────────────────────────────────────────────────────────┤
│  Frontend (Next.js 16)  │  Backend (Node.js 20)             │
│  - React 19.2.3         │  - Prisma 7 (PostgreSQL)          │
│  - shadcn/ui            │  - BullMQ 5 (Redis)               │
│  - Recharts             │  - JWT Auth                       │
│  - TanStack Table       │                                   │
├─────────────────────────────────────────────────────────────┤
│                    Data Layer                                │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL 16          │  Redis 7                          │
│  - User accounts        │  - Sessions                       │
│  - Stock data           │  - Cache                          │
│  - Documents            │  - Job queues                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Runtime Dependencies

### Core Application Framework

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `next` | ^16.2.3 | React framework with SSR/SSG | MIT |
| `react` | 19.2.3 | UI library | MIT |
| `react-dom` | 19.2.3 | React DOM rendering | MIT |

### Database & ORM

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `@prisma/client` | ^7.4.2 | Type-safe database ORM | Apache-2.0 |
| `@prisma/adapter-pg` | ^7.5.0 | PostgreSQL adapter for Prisma | Apache-2.0 |
| `pg` | ^8.20.0 | PostgreSQL client | MIT |

### Caching & Queue

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `ioredis` | ^5.10.0 | Redis client | MIT |
| `bullmq` | ^5.71.1 | Redis-based job queue | MIT |
| `prom-client` | ^15.1.3 | Prometheus metrics | Apache-2.0 |

### Authentication & Security

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `bcryptjs` | ^3.0.3 | Password hashing | MIT |
| `jose` | ^6.2.2 | JWT handling | MIT |
| `@sentry/nextjs` | ^10.47.0 | Error tracking (optional) | Sentry |
| `ws` | ^8.20.0 | WebSocket support | MIT |

### UI Components & Icons

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `@radix-ui/react-dialog` | ^1.1.15 | Accessible dialogs | MIT |
| `@radix-ui/react-popover` | ^1.1.15 | Accessible popovers | MIT |
| `@radix-ui/react-progress` | ^1.1.8 | Progress bars | MIT |
| `@radix-ui/react-slot` | ^1.2.4 | Slot primitive | MIT |
| `@radix-ui/react-switch` | ^1.2.6 | Toggle switches | MIT |
| `shadcn` | ^3.6.2 | UI component system | MIT |
| `@base-ui/react` | ^1.0.0 | Base UI components | MIT |
| `lucide-react` | ^0.562.0 | Icon library | ISC |
| `@hugeicons/react` | ^1.1.3 | Custom icons | Proprietary |
| `@hugeicons/core-free-icons` | ^3.0.0 | Custom icon set | Proprietary |

### Drag & Drop

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `@dnd-kit/core` | ^6.3.1 | Drag and drop primitives | MIT |
| `@dnd-kit/modifiers` | ^9.0.0 | DnD modifiers | MIT |
| `@dnd-kit/sortable` | ^10.0.0 | Sortable lists | MIT |
| `@dnd-kit/utilities` | ^3.2.2 | DnD utilities | MIT |

### Data Visualization

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `recharts` | ^2.15.4 | Chart library | MIT |
| `@react-pdf/renderer` | ^4.3.2 | PDF generation | MIT |

### Form & Input Handling

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `react-day-picker` | ^9.13.0 | Date picker | MIT |
| `input-otp` | ^1.4.2 | OTP input | MIT |
| `cmdk` | ^1.1.1 | Command palette | MIT |
| `zod` | ^4.3.6 | Schema validation | MIT |
| `date-fns` | ^4.1.0 | Date manipulation | MIT |

### Table & Data Grid

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `@tanstack/react-table` | ^8.21.3 | Data table | MIT |

### Styling & CSS

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `tailwind-merge` | ^3.4.0 | Tailwind utilities | MIT |
| `clsx` | ^2.1.1 | Class name utilities | MIT |
| `class-variance-authority` | ^0.7.1 | Component variants | MIT |
| `tw-animate-css` | ^1.4.0 | Animations | MIT |
| `vaul` | ^1.1.2 | Drawer component | MIT |
| `sonner` | ^2.0.7 | Toast notifications | MIT |

### Theming

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `next-themes` | ^0.4.6 | Dark/light mode | MIT |

### Logging

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `pino` | ^10.3.1 | JSON logging | MIT |

### Utilities

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `dotenv` | ^17.3.1 | Environment variables | BSD-2-Clause |

---

## Development Dependencies

### Testing

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `vitest` | ^3.0.8 | Test framework | MIT |
| `@vitest/coverage-v8` | ^3.2.4 | Code coverage | MIT |
| `@testing-library/react` | ^16.2.0 | React testing | MIT |
| `@testing-library/jest-dom` | ^6.6.3 | DOM testing utils | MIT |
| `@testing-library/dom` | ^10.4.0 | DOM testing | MIT |
| `@jest/globals` | ^30.3.0 | Jest globals | MIT |
| `jsdom` | ^26.0.1 | DOM environment | MIT |

### TypeScript & Type Support

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `typescript` | ^5 | TypeScript compiler | Apache-2.0 |
| `@types/node` | ^20 | Node.js types | MIT |
| `@types/react` | ^19 | React types | MIT |
| `@types/react-dom` | ^19 | React DOM types | MIT |
| `@types/bcryptjs` | ^2.4.6 | bcryptjs types | MIT |

### Linting & Formatting

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `eslint` | ^9 | Linting engine | MIT |
| `eslint-config-next` | ^16.2.3 | Next.js ESLint config | MIT |
| `typescript-eslint` | ^8.57.2 | TypeScript ESLint | MIT |
| `eslint-plugin-react-hooks` | ^7.0.1 | React hooks linting | MIT |
| `eslint-plugin-react-refresh` | ^0.5.2 | React refresh linting | MIT |
| `@eslint/compat` | ^2.0.3 | ESLint compat | MIT |
| `globals` | ^17.4.0 | Global JS definitions | MIT |

### Build Tools

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `@vitejs/plugin-react` | ^4.3.4 | React Vite plugin | MIT |
| `prisma` | ^7.4.2 | Database migration tool | Apache-2.0 |
| `tsx` | ^4.21.0 | TypeScript executor | MIT |
| `tailwindcss` | ^4 | CSS framework | MIT |
| `@tailwindcss/postcss` | ^4 | Tailwind PostCSS | MIT |
| `pino-pretty` | ^13.1.3 | Log formatting | MIT |

---

## System Dependencies

### Build-Time (Alpine Linux)

| Package | Purpose |
|---------|---------|
| `openssl` | SSL/TLS operations |
| `libc6-compat` | C library compatibility |

### Runtime (Alpine Linux)

| Package | Purpose |
|---------|---------|
| `curl` | Health checks, backup scripts |
| `netcat-openbsd` | Network connectivity checks |
| `openssh-client` | Network diagnostics |

### PostgreSQL Client Tools

These are available in the migration and backup containers:

| Package | Purpose |
|---------|---------|
| `pg_isready` | Database health check |
| `pg_dump` | Database backup |
| `psql` | Database CLI |

### Redis Tools

| Package | Purpose |
|---------|---------|
| `redis-cli` | Redis health checks |

---

## Base Docker Images

### Application Images

| Image | Version | Digest | Purpose |
|-------|---------|--------|---------|
| `node` | 20-alpine | `sha256:cabb115c...` | Main application runtime |
| `node` | 20-alpine | `sha256:f598378b...` | Coolify deployment |

### Database & Cache Images

| Image | Version | Digest | Purpose |
|-------|---------|--------|---------|
| `postgres` | 16-alpine | `sha256:8baec7c0...` | Primary database |
| `redis` | 7-alpine | `sha256:a0b3e2a8...` | Cache and sessions |

### Monitoring Images (Production Only)

| Image | Version | Purpose |
|-------|---------|---------|
| `prom/prometheus` | v2.48.0 | Metrics collection |
| `prom/alertmanager` | v0.26.0 | Alert routing |
| `grafana/grafana` | 10.2.0 | Metrics visualization |
| `prom/postgres-exporter` | v0.12.0 | PostgreSQL metrics |
| `redis/redis-exporter` | v1.55.0 | Redis metrics |

---

## External Services

### Cloud Services (Optional)

| Service | Purpose | Required | Configuration |
|---------|---------|----------|---------------|
| Sentry | Error tracking | No | `SENTRY_DSN` environment variable |

### CDN Services (Optional)

| Service | Purpose | Required | Configuration |
|---------|---------|----------|---------------|
| CloudFront | Static asset CDN | No | Configured in `next.config.ts` |

### Email Services (Optional)

| Service | Purpose | Required | Configuration |
|---------|---------|----------|---------------|
| SMTP Server | Email notifications | No | `SMTP_*` environment variables |

---

## Dependency Graph

### Core Dependencies Hierarchy

```
next (16.2.3)
├── react (19.2.3)
│   └── react-dom (19.2.3)
├── @prisma/client (7.4.2)
│   └── @prisma/adapter-pg (7.5.0)
│       └── pg (8.20.0)
├── @sentry/nextjs (10.47.0)
│   └── @sentry/node (transitive)
├── jose (6.2.2)
│   └── @panva/asn1.js (transitive)
├── bcryptjs (3.0.3)
│   └── bindings (transitive)
├── bullmq (5.71.1)
│   └── ioredis (5.10.0)
├── prom-client (15.1.3)
│   └── @opentelemetry/api (transitive)
└── zod (4.3.6)
```

### UI Dependencies Hierarchy

```
shadcn/ui components
├── @radix-ui/react-dialog
├── @radix-ui/react-popover
├── @radix-ui/react-dropdown-menu
├── @radix-ui/react-select
├── @radix-ui/react-tabs
├── @radix-ui/react-tooltip
├── @radix-ui/react-avatar
├── @radix-ui/react-separator
├── @radix-ui/react-toggle
├── @radix-ui/react-toggle-group
├── @radix-ui/react-slot
├── class-variance-authority
├── clsx
├── tailwind-merge
└── tailwindcss
```

---

## Security Considerations

### Dependency Scanning

All dependencies are locked via `package-lock.json` to ensure reproducible builds. The Docker build process:

1. Uses `npm ci --prefer-offline` for deterministic installation
2. Copies only production dependencies to the final image
3. Runs as a non-root user (`nextjs` with UID 1001)

### Known Excluded Dependencies

The following development dependencies are explicitly excluded from production builds:

- `@testing-library/*` - Testing only
- `vitest` - Test runner
- `@jest/globals` - Test globals
- `jsdom` - Test environment
- `eslint` - Linting (done at build time)
- `pino-pretty` - Development logging
- `tsx` - TypeScript execution

### Secret Management

Secrets are managed via:
1. Docker Secrets (production)
2. Environment variables (development)
3. Files mounted at runtime

---

## Dependency Update Strategy

### Regular Updates

1. **Security patches**: Review weekly, apply immediately for critical CVEs
2. **Minor versions**: Monthly review, apply quarterly
3. **Major versions**: Quarterly review, test thoroughly before applying

### Update Process

```bash
# 1. Update dependencies
npm update

# 2. Update lockfile
npm install

# 3. Generate new Prisma client
npm run db:generate

# 4. Test locally
npm run dev

# 5. Run tests
npm run test:all

# 6. Build production
npm run build

# 7. Test Docker build
docker build -t hay2010_stock:test .
```

---

## Appendix: Package Metadata

### Total Dependencies Count

| Category | Count |
|----------|-------|
| Runtime Dependencies | 45 |
| Development Dependencies | 23 |
| **Total** | **68** |

### License Summary

| License | Count |
|---------|-------|
| MIT | 42 |
| Apache-2.0 | 4 |
| Proprietary | 2 |
| ISC | 1 |
| BSD-2-Clause | 1 |
| Other | 1 |

---

**Document Version:** 1.0.0
**Last Updated:** 2026-04-17
**Maintained By:** HAY2010 Development Team