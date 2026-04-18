# HAY2010 Stock Application - Local Deployment Guide

**Version:** 3.0
**Last Updated:** 2026-04-17
**Deployment Type:** Docker-based Local Development

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Project Structure](#project-structure)
5. [Configuration](#configuration)
6. [Deployment Commands](#deployment-commands)
7. [Database Management](#database-management)
8. [Troubleshooting](#troubleshooting)
9. [Development Workflow](#development-workflow)
10. [Security Considerations](#security-considerations)

---

## Overview

This guide covers the complete local deployment of the HAY2010 Stock Application using Docker and Docker Compose. The deployment is **fully self-contained** and requires no external services:

- **PostgreSQL 16** - Primary database
- **Redis 7** - Caching and session storage
- **Next.js 16** - Application frontend and API
- **Prisma 7** - Database ORM and migrations

### Key Features

- ✅ **Zero external dependencies** - Everything runs in Docker
- ✅ **No cloud services required** - Local deployment only
- ✅ **Reproducible builds** - Docker layers are cached
- ✅ **Environment variable configuration** - No secrets files needed
- ✅ **Health checks** - All services are monitored
- ✅ **Graceful shutdown** - Clean container shutdown handling

---

## Prerequisites

### Required Software

| Software | Minimum Version | Recommended Version | Purpose |
|----------|-----------------|---------------------|---------|
| Docker | 20.10+ | 24.0+ | Container runtime |
| Docker Compose | 2.0+ | 2.20+ | Multi-container orchestration |
| Git | 2.30+ | 2.40+ | Version control |

### System Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 cores | 4 cores |
| Memory | 4 GB | 8 GB |
| Disk Space | 10 GB | 20 GB |

### Operating Systems

- **Linux** (Ubuntu 20.04+, Debian 11+)
- **macOS** (Monterey 12+)
- **Windows** (Windows 10+ with WSL2)

---

## Quick Start

### 1. Clone and Navigate

```bash
git clone <repository-url>
cd stock_app
```

### 2. Start Services

```bash
# Build and start all services
docker-compose -f docker-compose.local.yml up -d

# View logs during startup
docker-compose -f docker-compose.local.yml logs -f
```

### 3. Verify Deployment

```bash
# Check service health
docker-compose -f docker-compose.local.yml ps

# Test API health endpoint
curl http://localhost:3000/api/health
```

### 4. Access Application

Open your browser and navigate to:
- **Application:** http://localhost:3000
- **Health Check:** http://localhost:3000/api/health

---

## Project Structure

```
stock_app/
├── .env                      # Environment variables (DO NOT COMMIT)
├── .env.local               # Local environment overrides
├── .env.docker              # Docker environment template
├── .env.example             # Example environment file
│
├── docker-compose.local.yml  # Local Docker deployment
├── docker-compose.yml        # Production Docker deployment
├── docker-compose.prod.yml   # Production with monitoring
│
├── Dockerfile.local          # Local Dockerfile
├── Dockerfile                # Production Dockerfile
├── Dockerfile.coolify        # Coolify deployment
│
├── docker-entrypoint.local.sh # Local entrypoint script
├── docker-entrypoint.sh       # Production entrypoint
│
├── prisma/
│   ├── schema.prisma         # Database schema
│   ├── seed.ts               # Database seeder
│   └── migrations/           # Database migrations
│
├── lib/
│   ├── db/                   # Database utilities
│   ├── auth/                 # Authentication
│   ├── cache/                # Caching utilities
│   ├── queue/                # Job queues
│   └── workers/              # Background workers
│
├── app/
│   ├── api/                  # API routes
│   └── actions/              # Server actions
│
├── components/               # React components
├── monitoring/               # Monitoring configs
└── scripts/                  # Utility scripts
```

---

## Configuration

### Environment Variables

The application uses environment variables for all configuration. The `.env` file is loaded by Docker Compose:

```bash
# Core Database
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/hay2010_db?connection_limit=5&pool_timeout=10
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=hay2010_db

# Redis
REDIS_URL=redis://:@redis:6379/0
REDIS_PASSWORD=

# Authentication
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=24h

# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=HAY2010 Stock
NEXT_PUBLIC_COMPANY_NAME=HAY2010
NEXT_PUBLIC_APP_VERSION=1.0.0

# Security (relaxed for local)
SECURE_COOKIES=false
LOCKOUT_FAIL_CLOSED=false
RATE_LIMIT_FAIL_CLOSED=false
```

### Customizing Configuration

#### Change PostgreSQL Password

Edit `docker-compose.local.yml`:

```yaml
postgres:
  environment:
    - POSTGRES_PASSWORD=your-new-password
```

Then update `DATABASE_URL` in your `.env` file.

#### Change JWT Secret

Update the `JWT_SECRET` environment variable:

```bash
# Generate a secure secret
openssl rand -base64 64
```

#### Change Redis Memory Limits

Edit the Redis command in `docker-compose.local.yml`:

```yaml
redis:
  command: >
    redis-server
    --maxmemory 512mb
    --maxmemory-policy allkeys-lru
```

---

## Deployment Commands

### Starting Services

```bash
# Start all services in detached mode
docker-compose -f docker-compose.local.yml up -d

# Start with rebuild
docker-compose -f docker-compose.local.yml up -d --build

# Start specific service
docker-compose -f docker-compose.local.yml up -d postgres

# Start all services and show logs
docker-compose -f docker-compose.local.yml up
```

### Stopping Services

```bash
# Stop all services (keep volumes)
docker-compose -f docker-compose.local.yml down

# Stop and remove volumes (DESTROYS DATA)
docker-compose -f docker-compose.local.yml down -v

# Stop and remove everything including images
docker-compose -f docker-compose.local.yml down --rmi local
```

### Viewing Logs

```bash
# View all logs
docker-compose -f docker-compose.local.yml logs -f

# View specific service logs
docker-compose -f docker-compose.local.yml logs -f app
docker-compose -f docker-compose.local.yml logs -f postgres
docker-compose -f docker-compose.local.yml logs -f redis

# View last 100 lines
docker-compose -f docker-compose.local.yml logs --tail 100
```

### Checking Status

```bash
# List running containers
docker-compose -f docker-compose.local.yml ps

# Check service health
docker inspect hay2010_stock --format='{{.State.Health.Status}}'
docker inspect hay2010_postgres --format='{{.State.Health.Status}}'
docker inspect hay2010_redis --format='{{.State.Health.Status}}'
```

### Rebuilding

```bash
# Rebuild without cache
docker-compose -f docker-compose.local.yml build --no-cache

# Rebuild specific service
docker-compose -f docker-compose.local.yml build --no-cache app

# Rebuild after dependency changes
docker-compose -f docker-compose.local.yml up -d --build
```

---

## Database Management

### Running Migrations

Migrations run automatically on startup via the `migrate` service. To manually run migrations:

```bash
# Run pending migrations
docker-compose -f docker-compose.local.yml run --rm migrate

# Create new migration
docker-compose -f docker-compose.local.yml exec app npx prisma migrate dev --name add_new_table

# Reset database and reseed
docker-compose -f docker-compose.local.yml exec app npm run db:reset
```

### Database Access

```bash
# Connect to PostgreSQL
docker exec -it hay2010_postgres psql -U postgres -d hay2010_db

# Run SQL query
docker exec hay2010_postgres psql -U postgres -d hay2010_db -c "SELECT COUNT(*) FROM users;"

# Backup database
docker exec hay2010_postgres pg_dump -U postgres hay2010_db > backup.sql

# Restore database
docker exec -i hay2010_postgres psql -U postgres -d hay2010_db < backup.sql
```

### Prisma Commands

```bash
# Generate Prisma client
docker-compose -f docker-compose.local.yml exec app npm run db:generate

# Push schema changes
docker-compose -f docker-compose.local.yml exec app npm run db:push

# Seed database
docker-compose -f docker-compose.local.yml exec app npm run db:seed

# Reset database
docker-compose -f docker-compose.local.yml exec app npm run db:reset
```

### Redis Commands

```bash
# Connect to Redis
docker exec -it hay2010_redis redis-cli

# Monitor Redis traffic
docker exec -it hay2010_redis redis-cli monitor

# Check Redis info
docker exec hay2010_redis redis-cli info

# Flush all data
docker exec hay2010_redis redis-cli FLUSHALL
```

---

## Troubleshooting

### Common Issues

#### Port Already in Use

```
Error: port is already allocated
```

**Solution:**
```bash
# Find what's using port 3000
lsof -i :3000

# Or stop the conflicting service
docker-compose -f docker-compose.local.yml down
```

#### Database Connection Failed

```
Error: Connection refused to postgres:5432
```

**Solutions:**
1. Wait for PostgreSQL to initialize (up to 30 seconds)
2. Check PostgreSQL logs: `docker-compose logs postgres`
3. Verify DATABASE_URL is correct
4. Restart the app: `docker-compose restart app`

#### Migration Failed

```
Error: migration failed
```

**Solution:**
```bash
# Check migration logs
docker-compose logs migrate

# Reset and retry
docker-compose down -v
docker-compose up -d
```

#### Build Failed

```
Error: build failed
```

**Solutions:**
1. Clear Docker cache: `docker builder prune`
2. Rebuild without cache: `docker-compose build --no-cache`
3. Check for Node version mismatch (requires Node 20)

#### Prisma Client Not Generated

```
Error: Cannot find module '@prisma/client'
```

**Solution:**
```bash
docker-compose -f docker-compose.local.yml exec app npm run db:generate
docker-compose -f docker-compose.local.yml restart app
```

### Viewing Debug Logs

```bash
# Enable debug logging in app
docker-compose -f docker-compose.local.yml exec app \
    env NODE_ENV=development npm run dev

# Check application logs
docker-compose -f docker-compose.local.yml logs app --tail 200

# Check database query logs
docker exec hay2010_postgres psql -U postgres -d hay2010_db -c \
    "ALTER DATABASE hay2010_db SET log_statement = 'all';"
```

### Container Health Issues

```bash
# Force restart a service
docker-compose -f docker-compose.local.yml restart <service>

# Recreate a service
docker-compose -f docker-compose.local.yml up -d --force-recreate <service>

# View container details
docker inspect hay2010_stock
```

---

## Development Workflow

### Local Development

```bash
# Start services
docker-compose -f docker-compose.local.yml up -d

# View logs
docker-compose -f docker-compose.local.yml logs -f app

# Run tests inside container
docker-compose -f docker-compose.local.yml exec app npm run test

# Run linter
docker-compose -f docker-compose.local.yml exec app npm run lint

# Type checking
docker-compose -f docker-compose.local.yml exec app npx tsc --noEmit
```

### Hot Reload

For development with hot reload, you may want to mount the source directory:

```yaml
app:
  volumes:
    - .:/app
    - /app/node_modules
    - /app/.next
```

Then run:
```bash
docker-compose -f docker-compose.local.yml up -d
docker-compose -f docker-compose.local.yml exec app npm run dev
```

### Making Schema Changes

```bash
# 1. Edit prisma/schema.prisma

# 2. Push changes to database
docker-compose -f docker-compose.local.yml exec app npx prisma db push

# 3. Generate client
docker-compose -f docker-compose.local.yml exec app npx prisma generate

# 4. Restart app
docker-compose -f docker-compose.local.yml restart app
```

---

## Security Considerations

### Local Development

The local deployment uses relaxed security settings for development convenience:

- `SECURE_COOKIES=false` - Cookies work without HTTPS
- `LOCKOUT_FAIL_CLOSED=false` - Failed login attempts don't lock accounts
- `RATE_LIMIT_FAIL_CLOSED=false` - Rate limiting is less strict

### Production Migration

When moving to production:

1. Enable secure cookies: `SECURE_COOKIES=true`
2. Enable lockout: `LOCKOUT_FAIL_CLOSED=true`
3. Enable rate limit: `RATE_LIMIT_FAIL_CLOSED=true`
4. Use strong JWT secrets (min 64 characters)
5. Use Docker secrets for sensitive data
6. Use the production `docker-compose.yml` or `docker-compose.prod.yml`

### Network Security

The local deployment uses Docker bridge networks:

- `backend` network: Internal communication between services
- All services are isolated from the host network except explicitly exposed ports

### Data Persistence

Database and Redis data are stored in Docker volumes:

- `postgres_data` - PostgreSQL data directory
- `redis_data` - Redis data directory

To completely destroy all data:
```bash
docker-compose -f docker-compose.local.yml down -v
```

---

## Appendix: Service Ports

| Service | Internal Port | External Port | Purpose |
|---------|--------------|---------------|---------|
| app | 3000 | 3000 | Application |
| postgres | 5432 | 5432 | Database |
| redis | 6379 | 6379 | Cache |

## Appendix: Volume Mounts

| Volume | Path | Purpose |
|--------|------|---------|
| postgres_data | /var/lib/postgresql/data | Database files |
| redis_data | /data | Redis persistence |
| ./prisma | /app/prisma | Schema files |
| ./lib/generated | /app/lib/generated | Generated Prisma client |

## Appendix: Health Check Endpoints

- **Application:** `http://localhost:3000/api/health`
- **Public Health:** `http://localhost:3000/api/health/public`
- **Metrics:** `http://localhost:3000/api/metrics`

---

**Document Version:** 3.0
**Last Updated:** 2026-04-17
**Maintained By:** HAY2010 Development Team