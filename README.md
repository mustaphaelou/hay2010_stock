# HAY2010 Stock Application

Enterprise-grade stock management system built with Next.js 16, designed for managing inventory, sales documents, partners, and business operations.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)
- [Security](#security)
- [Monitoring](#monitoring)
- [Contributing](#contributing)
- [License](#license)

## Overview

HAY2010 Stock Application is a comprehensive inventory and business management system that handles:

- **Stock Management**: Real-time inventory tracking across multiple warehouses
- **Sales Documents**: Quotations, orders, delivery notes, and invoices
- **Partner Management**: Customers and suppliers with credit limits and pricing
- **Business Affairs**: Project/affair tracking with budgeting
- **Product Catalog**: Products with categories, tariffs, and lot/serial tracking

### Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 |
| **Database** | PostgreSQL 16 |
| **ORM** | Prisma 7 |
| **Cache** | Redis 7 (with cluster support) |
| **UI** | React 19, Tailwind CSS 4, shadcn/ui |
| **Charts** | Recharts |
| **PDF** | @react-pdf/renderer |
| **Queue** | BullMQ |
| **Monitoring** | Prometheus, Sentry |
| **Container** | Docker, Kubernetes |

## Features

### Core Modules

- **Dashboard**: Real-time metrics, charts, and KPIs
- **Articles/Products**: Product catalog with categories, tariffs, and stock tracking
- **Stock**: Inventory levels, movements, and warehouse management
- **Sales**: Sales documents workflow (Devis → Bon de commande → Bon de livraison → Facture)
- **Purchases**: Purchase orders and supplier management
- **Partners**: Customer and supplier management with credit tracking
- **Documents**: Document generation and PDF export
- **Affairs/Projects**: Business affair tracking with margins

### Security Features

- JWT-based authentication with session management
- Rate limiting with Redis-backed sliding window
- CSRF protection for server actions
- Role-based access control (ADMIN, MANAGER, USER, VIEWER)
- Security headers (CSP, X-Frame-Options, etc.)
- Password hashing with bcryptjs
- Account lockout after failed attempts

### Performance Features

- Redis caching with versioned keys
- Optimistic UI updates
- Real-time dashboard with WebSocket
- Bundle optimization with package imports
- Edge middleware for auth/rate limiting

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (Browser)                      │
├─────────────────────────────────────────────────────────────┤
│  React 19 │ Tailwind CSS │ shadcn/ui │ Recharts             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js 16 (App Router)                   │
├─────────────────────────────────────────────────────────────┤
│  Pages (app/) │ Server Actions │ API Routes │ Middleware    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       Services Layer                         │
├─────────────────────────────────────────────────────────────┤
│  Auth │ Validation │ Cache │ Queue │ PDF Generation         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL (Prisma) │ Redis (ioredis) │ BullMQ             │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
stock_app/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes (health, metrics, csrf)
│   ├── articles/          # Product management
│   ├── stock/             # Inventory management
│   ├── sales/             # Sales documents
│   ├── purchases/         # Purchase orders
│   ├── partners/          # Partner management
│   ├── documents/         # Document generation
│   ├── affaires/          # Business affairs
│   ├── login/             # Authentication
│   └── register/          # User registration
├── components/            # React components
│   └── ui/               # shadcn/ui components
├── lib/                   # Core libraries
│   ├── auth/             # Authentication utilities
│   ├── db/               # Database clients (Prisma, Redis)
│   ├── middleware/       # Rate limiting middleware
│   ├── security/         # CSRF, nonce utilities
│   ├── cache/            # Caching strategies
│   ├── queue/            # BullMQ job queues
│   ├── pdf/              # PDF generation
│   └── workers/          # Background workers
├── prisma/               # Database schema and migrations
├── hooks/                # React hooks
├── scripts/              # Utility scripts
├── k8s/                  # Kubernetes manifests
├── monitoring/           # Prometheus/Grafana configs
└── .github/              # CI/CD workflows
```

## Prerequisites

### Required

- **Node.js**: v20.x or later
- **npm**: v10.x or later
- **PostgreSQL**: 16.x or later
- **Redis**: 7.x or later

### Optional (for deployment)

- **Docker**: 24.x or later
- **Kubernetes**: 1.28+ (for production)
- **Coolify**: For managed deployments

### System Requirements

| Environment | CPU | RAM | Storage |
|-------------|-----|-----|---------|
| Development | 2 cores | 4GB | 10GB |
| Staging | 2 cores | 4GB | 20GB |
| Production | 4 cores | 8GB | 50GB |

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/hay2010/stock-app.git
cd stock-app/stock_app
```

### 2. Install Dependencies

```bash
npm ci
```

### 3. Set Up Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/hay2010_db"

# Redis
REDIS_URL="redis://localhost:6379"

# Authentication
JWT_SECRET="your-secure-jwt-secret-here-change-in-production"

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

### 4. Initialize Database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed initial data (admin user, sample data)
npm run db:seed
```

### 5. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### Default Admin Credentials

After seeding, use these credentials for first login:

- **Email**: `admin@hay2010.com`
- **Password**: `Admin@123456`

> ⚠️ **Important**: Change the default admin password immediately after first login.

## Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| `REDIS_URL` | Redis connection string | Yes | - |
| `JWT_SECRET` | Secret for JWT signing (min 32 chars) | Yes | - |
| `JWT_EXPIRES_IN` | Token expiration time | No | `24h` |
| `NEXT_PUBLIC_APP_URL` | Public application URL | Yes | - |
| `NODE_ENV` | Environment mode | No | `development` |
| `CORS_ORIGINS` | Allowed CORS origins | No | `http://localhost:3000` |
| `SENTRY_DSN` | Sentry error tracking DSN | No | - |

### Redis Configuration

For single Redis instance:

```env
REDIS_URL="redis://localhost:6379"
```

For Redis Cluster (production):

```env
REDIS_CLUSTER_NODES="redis-1:6379,redis-2:6379,redis-3:6379"
REDIS_PASSWORD="your-redis-password"
```

### Rate Limiting

Default rate limits are configured per endpoint:

| Endpoint | Requests | Window |
|----------|----------|--------|
| `/api/auth/login` | 10 | 60s |
| `/api/auth/register` | 5 | 300s |
| `/api/auth/forgot-password` | 3 | 300s |
| `/api/documents/generate-pdf` | 20 | 60s |
| `/api/products` | 500 | 60s |
| Default | 500 | 60s |

## Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Production build
npm run start            # Start production server

# Database
npm run db:push          # Push schema changes
npm run db:generate      # Generate Prisma client
npm run db:seed          # Seed database
npm run db:reset         # Reset and reseed

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix lint issues

# Testing
npm run test             # Run tests (watch mode)
npm run test:ci          # Run tests with coverage

# Docker
npm run docker:build     # Build Docker image
npm run docker:up        # Start containers
npm run docker:down      # Stop containers
npm run docker:logs      # View container logs

# Kubernetes
npm run k8s:apply:staging     # Deploy to staging
npm run k8s:apply:production  # Deploy to production
```

### Code Style

- **ESLint**: Configured for Next.js with React hooks rules
- **TypeScript**: Strict mode enabled
- **Prettier**: Integrated with ESLint

### Database Schema

Key entities:

- **User**: Authentication and authorization
- **Partenaire**: Customers and suppliers
- **Produit**: Product catalog
- **Entrepot**: Warehouses
- **NiveauStock**: Stock levels per warehouse
- **DocVente**: Sales documents
- **MouvementStock**: Stock movements

See `prisma/schema.prisma` for complete schema documentation.

## Testing

### Test Structure

```
src/__tests__/
├── lib/
│   ├── auth/          # Authentication tests
│   ├── security/      # Security tests (CSRF)
│   └── ...            # Utility tests
├── app/
│   └── actions/       # Server action tests
└── health.test.ts     # Health endpoint tests
```

### Running Tests

```bash
# Run all tests in watch mode
npm run test

# Run tests with coverage
npm run test:ci

# Run specific test file
npx vitest run src/__tests__/lib/auth/jwt.test.ts
```

### Test Coverage

Coverage reports are generated in `coverage/` directory:

- **HTML Report**: `coverage/index.html`
- **LCOV**: `coverage/lcov.info`

## Deployment

### Docker Deployment

#### Build Image

```bash
docker build -t hay2010_stock:latest .
```

#### Run Container

```bash
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e REDIS_URL="redis://..." \
  -e JWT_SECRET="..." \
  hay2010_stock:latest
```

#### Docker Compose

```bash
# Development
npm run docker:up

# Production
npm run docker:prod:up
```

### Kubernetes Deployment

```bash
# Staging
npm run k8s:apply:staging

# Production
npm run k8s:apply:production
```

### Coolify Deployment

The application is configured for Coolify deployment with:

- Health check endpoint: `/api/health`
- Standalone output mode
- Docker entrypoint script

### CI/CD Pipeline

GitHub Actions workflow includes:

1. **Quality Checks**: Linting, TypeScript, Dockerfile lint
2. **Security Scanning**: CodeQL, Trivy, Gitleaks, npm audit
3. **Testing**: Unit tests with coverage, integration tests
4. **Build**: Docker image build and push to GHCR
5. **Deploy**: Trigger Coolify webhooks

See `.github/workflows/ci-cd.yml` for complete pipeline configuration.

## API Documentation

### Health Check Endpoints

#### GET /api/health

Returns application health status.

**Public Response:**

```json
{
  "status": "ok",
  "timestamp": "2026-04-13T10:00:00.000Z",
  "checks": {
    "database": true,
    "redis": true,
    "schema": true
  }
}
```

**Authenticated Response** (ADMIN/MANAGER):

```json
{
  "status": "ok",
  "timestamp": "2026-04-13T10:00:00.000Z",
  "checks": {
    "database": true,
    "redis": true,
    "schema": true
  },
  "services": {
    "database": "connected",
    "redis": "connected",
    "app": "running"
  },
  "latency": {
    "database": 5,
    "redis": 2
  },
  "version": "1.0.0",
  "environment": "production",
  "isAdmin": true
}
```

#### GET /api/metrics

Prometheus metrics endpoint.

**Response:**

```
# HELP app_info Application information
# TYPE app_info gauge
app_info{version="1.0.0",node_env="production"} 1

# HELP db_connections Database connection pool metrics
# TYPE db_connections gauge
db_connections{state="active"} 5
```

#### GET /api/csrf-token

CSRF token generation endpoint.

**Response:**

```json
{
  "token": "csrf_xxxxx",
  "expiresAt": "2026-04-13T11:00:00.000Z"
}
```

### Rate Limit Headers

All API responses include rate limit headers:

```
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 498
X-RateLimit-Reset: 1715600123456
```

## Security

### Authentication Flow

1. User submits credentials to `/api/auth/login`
2. Server validates credentials and generates JWT
3. JWT stored in HTTP-only, secure cookie
4. Middleware validates JWT on each request
5. User info attached to request headers

### Authorization

Role hierarchy: `ADMIN` > `MANAGER` > `USER` > `VIEWER`

| Role | Permissions |
|------|-------------|
| `ADMIN` | Full system access, user management |
| `MANAGER` | All operations, reports, configuration |
| `USER` | Daily operations, stock movements |
| `VIEWER` | Read-only access, reports |

### Security Headers

All responses include:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy: ...`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### CSRF Protection

- Server actions protected with CSRF tokens
- Tokens generated per-session
- Automatic token refresh

### Rate Limiting

- Redis-backed sliding window algorithm
- Circuit breaker for Redis failures
- Tiered limits per endpoint type
- Automatic IP identification via headers

## Monitoring

### Prometheus Metrics

Available at `/api/metrics`:

- Application info and version
- Database connection pool metrics
- Rate limiting statistics
- Custom business metrics

### Grafana Dashboards

Pre-configured dashboards for:

- Application health overview
- API performance metrics
- Database query performance
- Redis cache hit rates
- Business KPIs

### Sentry Integration

Error tracking with:

- Automatic error capture
- Performance monitoring
- Session replay
- Source map upload

### Logging

Structured logging with Pino:

- JSON format in production
- Pretty printing in development
- Log levels: trace, debug, info, warn, error
- Request context propagation

## Contributing

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make changes and add tests
4. Run linting and tests: `npm run lint && npm run test`
5. Commit changes: `git commit -m "feat: add my feature"`
6. Push branch: `git push origin feature/my-feature`
7. Create Pull Request

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Adding/updating tests
- `chore:` Maintenance tasks

### Code Review Guidelines

- All code requires review before merge
- At least one approval required
- All CI checks must pass
- No unresolved comments

## License

MIT License - See [LICENSE](LICENSE) for details.

---

## Support

- **Documentation**: https://docs.hay2010.com
- **Issues**: https://github.com/hay2010/stock-app/issues
- **Email**: support@hay2010.com

---

**Built with ❤️ by HAY2010 Team**