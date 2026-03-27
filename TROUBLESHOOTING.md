# Docker Login Issue - Comprehensive Troubleshooting Guide

This guide provides step-by-step instructions to diagnose and resolve login issues for the HAY2010 application running in Docker.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Common Failure Points](#common-failure-points)
3. [Diagnostic Commands](#diagnostic-commands)
4. [Step-by-Step Troubleshooting](#step-by-step-troubleshooting)
5. [Common Fixes](#common-fixes)
6. [Prevention & Best Practices](#prevention--best-practices)

---

## Architecture Overview

The application stack consists of:

| Service | Container Name | Port | Dependencies |
|---------|---------------|------|--------------|
| Next.js App | `hay2010_stock` | 3000 | PostgreSQL, Redis |
| PostgreSQL | `hay2010_postgres` | 5432 (localhost only) | None |
| Redis | `hay2010_redis` | 6379 (localhost only) | None |
| Migrations | `hay2010_migrate` | N/A | PostgreSQL |

### Login Flow

```
User → Login Form → Server Action → Prisma (PostgreSQL) → Redis Session → JWT Cookie
```

**Critical Dependencies:**
- **PostgreSQL**: Stores user credentials and data
- **Redis**: Stores session data (required for login to work)
- **JWT_SECRET**: Environment variable for token signing

---

## Common Failure Points

### 1. Container Not Running
- App container crashed or failed to start
- Migration container failed, blocking app startup

### 2. Database Connection Failure
- PostgreSQL not ready when app starts
- Connection string misconfigured
- Database doesn't exist

### 3. Redis Connection Failure
- Redis not running or unreachable
- Session creation fails silently
- Login appears to work but session isn't stored

### 4. Missing Environment Variables
- `JWT_SECRET` not set (throws error in middleware)
- `DATABASE_URL` incorrect
- `REDIS_URL` incorrect

### 5. Migration Not Completed
- User table doesn't exist
- No users in database

### 6. Port Binding Issues
- Port 3000 already in use
- Firewall blocking connections

### 7. Network Connectivity
- Docker networks misconfigured
- Containers can't communicate

---

## Diagnostic Commands

### Quick Health Check (All-in-One)

```bash
# Run this first for a complete overview
echo "=== Container Status ===" && \
docker ps -a --filter "name=hay2010" && \
echo "" && \
echo "=== App Logs (last 30 lines) ===" && \
docker logs hay2010_stock --tail 30 2>&1 && \
echo "" && \
echo "=== Health Endpoint ===" && \
curl -s http://localhost:3000/api/health && \
echo "" && \
echo "=== Redis Ping ===" && \
docker exec hay2010_redis redis-cli ping 2>&1 && \
echo "" && \
echo "=== Database Tables ===" && \
docker exec hay2010_postgres psql -U postgres -d hay2010_db -c "\dt" 2>&1
```

---

## Step-by-Step Troubleshooting

### Step 1: Verify Container Status

Check if all containers are running:

```bash
docker ps -a --filter "name=hay2010"
```

**Expected Output:**
```
NAMES              STATUS
hay2010_stock      Up 2 minutes (healthy)
hay2010_redis      Up 2 minutes
hay2010_postgres   Up 2 minutes (healthy)
hay2010_migrate    Exited (0) 2 minutes ago
```

**What to Look For:**
- `hay2010_stock`: Should show `Up` and `(healthy)`
- `hay2010_migrate`: Should show `Exited (0)` (successful completion)
- If any container shows `Exited (1)` or `Restarting`, there's a problem

**If containers are not running:**
```bash
# Start all containers
docker-compose -f stock_app/docker-compose.yml up -d

# Or restart specific container
docker restart hay2010_stock
```

---

### Step 2: Analyze Docker Logs

#### App Logs
```bash
docker logs hay2010_stock --tail 100
```

**Look for:**
- `Starting Next.js server...` - Confirms app started
- `Database port is open!` - Confirms DB connectivity
- Error messages about Redis or JWT

#### Migration Logs (Critical!)
```bash
docker logs hay2010_migrate --tail 50
```

**Look for:**
- `Prisma migrate deploy` output
- "No migration found" or error messages
- If this failed, the User table may not exist

#### Redis Logs
```bash
docker logs hay2010_redis --tail 50
```

**Look for:**
- `Ready to accept connections`
- Memory or configuration errors

#### PostgreSQL Logs
```bash
docker logs hay2010_postgres --tail 50
```

**Look for:**
- `database system is ready to accept connections`
- Connection or authentication errors

---

### Step 3: Check Port Mappings

Verify ports are correctly exposed:

```bash
docker port hay2010_stock
docker port hay2010_postgres
docker port hay2010_redis
```

**Expected Output:**
```
3000/tcp -> 0.0.0.0:3000
```

**Check if ports are in use:**
```bash
# Windows
netstat -ano | findstr :3000

# Linux/Mac
netstat -tlnp | grep 3000
```

**If port 3000 is in use by another process:**
```bash
# Find and kill the process (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or change the port in docker-compose.yml
ports:
  - "3001:3000"
```

---

### Step 4: Verify Health Endpoint

Test the application health endpoint:

```bash
curl -s http://localhost:3000/api/health | jq .
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "app": "running"
  },
  "latency": {
    "database": 5,
    "redis": 2
  }
}
```

**Status Meanings:**
- `healthy`: All services connected
- `degraded`: Redis disconnected (app works but sessions fail)
- `unhealthy`: Database disconnected (critical)

**If health check fails:**
```bash
# Check if app is responding at all
curl -v http://localhost:3000/

# Check from inside container
docker exec hay2010_stock curl -s http://localhost:3000/api/health
```

---

### Step 5: Check Redis Connectivity

Redis is **critical** for login - sessions are stored here.

```bash
# Test Redis from host
docker exec hay2010_redis redis-cli ping

# Test Redis from app container
docker exec hay2010_stock nc -zv redis 6379

# Check Redis stats
docker exec hay2010_redis redis-cli info stats
```

**Expected:** `PONG` response

**If Redis is not responding:**
```bash
# Restart Redis
docker restart hay2010_redis

# Check Redis configuration
docker exec hay2010_redis redis-cli CONFIG GET maxmemory
```

---

### Step 6: Check Database Connectivity

```bash
# Test database connection
docker exec hay2010_postgres pg_isready -U postgres -d hay2010_db

# List all tables
docker exec hay2010_postgres psql -U postgres -d hay2010_db -c "\dt"

# Check if User table exists
docker exec hay2010_postgres psql -U postgres -d hay2010_db -c "SELECT table_name FROM information_schema.tables WHERE table_name = 'User';"

# List users in database
docker exec hay2010_postgres psql -U postgres -d hay2010_db -c "SELECT id, email, name, role FROM \"User\" LIMIT 10;"
```

**If User table doesn't exist:**
```bash
# Re-run migrations
docker-compose -f stock_app/docker-compose.yml up migrate

# Or manually
docker exec hay2010_stock npx prisma migrate deploy
```

---

### Step 7: Verify Environment Variables

Check required environment variables:

```bash
# Check all environment variables in app container
docker exec hay2010_stock printenv | grep -E "JWT_SECRET|DATABASE_URL|REDIS_URL|NODE_ENV"

# Check specific variables
docker exec hay2010_stock printenv JWT_SECRET
docker exec hay2010_stock printenv DATABASE_URL
docker exec hay2010_stock printenv REDIS_URL
```

**Required Variables:**
| Variable | Example Value | Purpose |
|----------|---------------|---------|
| `JWT_SECRET` | `your-32-char-secret-key-here` | Signs JWT tokens |
| `DATABASE_URL` | `postgresql://postgres:postgres@postgres:5432/hay2010_db` | Database connection |
| `REDIS_URL` | `redis://redis:6379/0` | Redis connection |
| `NODE_ENV` | `production` | Environment mode |

**If JWT_SECRET is missing:**
```bash
# Add to .env.docker file
echo "JWT_SECRET=$(openssl rand -base64 32)" >> stock_app/.env.docker

# Restart containers
docker-compose -f stock_app/docker-compose.yml down
docker-compose -f stock_app/docker-compose.yml up -d
```

---

### Step 8: Test Network Connectivity

Verify containers can communicate:

```bash
# Test app → Redis
docker exec hay2010_stock nc -zv redis 6379

# Test app → PostgreSQL
docker exec hay2010_stock nc -zv postgres 5432

# List networks
docker network ls | grep hay2010

# Inspect network
docker network inspect stock_app_backend
docker network inspect stock_app_frontend
```

**If containers can't communicate:**
```bash
# Recreate networks
docker-compose -f stock_app/docker-compose.yml down
docker-compose -f stock_app/docker-compose.yml up -d
```

---

## Common Fixes

### Fix 1: Redis Connection Failure

**Symptoms:** Login appears to work but user is redirected back to login page

```bash
# Restart Redis
docker restart hay2010_redis

# Wait 5 seconds
sleep 5

# Restart app
docker restart hay2010_stock

# Verify
docker exec hay2010_redis redis-cli ping
```

### Fix 2: Database Migration Failure

**Symptoms:** "User table not found" or "relation does not exist"

```bash
# Check migration status
docker logs hay2010_migrate

# Re-run migrations
docker-compose -f stock_app/docker-compose.yml up migrate

# Or run manually
docker exec -it hay2010_stock npx prisma migrate deploy
```

### Fix 3: No Users in Database

**Symptoms:** Login fails with "Invalid email or password"

```bash
# Create admin user via Prisma Studio
docker exec -it hay2010_stock npx prisma studio

# Or create via SQL
docker exec hay2010_postgres psql -U postgres -d hay2010_db -c "
INSERT INTO \"User\" (id, email, password, name, role, \"createdAt\", \"updatedAt\")
VALUES (
  gen_random_uuid(),
  'admin@hay2010.com',
  '\$2a\$10\$YourHashedPasswordHere',
  'Admin',
  'ADMIN',
  NOW(),
  NOW()
);
"

# Or use the seed script if available
docker exec hay2010_stock npm run seed
```

### Fix 4: JWT_SECRET Missing

**Symptoms:** "JWT_SECRET environment variable is required" in logs

```bash
# Generate a secure secret
openssl rand -base64 32

# Add to .env.docker
echo "JWT_SECRET=your-generated-secret-here" >> stock_app/.env.docker

# Restart all containers
docker-compose -f stock_app/docker-compose.yml down
docker-compose -f stock_app/docker-compose.yml up -d
```

### Fix 5: Port Already in Use

**Symptoms:** "port is already allocated" error

```bash
# Find process using port 3000 (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Find process using port 3000 (Linux/Mac)
lsof -i :3000
kill -9 <PID>

# Or change port in docker-compose.yml
ports:
  - "3001:3000"  # Use port 3001 instead
```

### Fix 6: Full Reset

**When all else fails:**

```bash
# Stop and remove all containers, networks, volumes
docker-compose -f stock_app/docker-compose.yml down -v

# Rebuild images
docker-compose -f stock_app/docker-compose.yml build --no-cache

# Start fresh
docker-compose -f stock_app/docker-compose.yml up -d

# Follow logs
docker-compose -f stock_app/docker-compose.yml logs -f
```

---

## Prevention & Best Practices

### 1. Health Checks

The application has built-in health checks. Monitor them:

```bash
# Check container health status
docker inspect --format='{{.State.Health.Status}}' hay2010_stock

# View health check history
docker inspect --format='{{json .State.Health}}' hay2010_stock | jq .
```

### 2. Log Aggregation

Enable persistent logging:

```yaml
# Add to docker-compose.yml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 3. Resource Limits

Containers have resource limits configured. Monitor usage:

```bash
docker stats hay2010_stock hay2010_postgres hay2010_redis
```

### 4. Backup Database

Before making changes:

```bash
docker exec hay2010_postgres pg_dump -U postgres hay2010_db > backup_$(date +%Y%m%d).sql
```

### 5. Environment File Template

Ensure `.env.docker` contains all required variables:

```env
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password
POSTGRES_DB=hay2010_db

# Redis
REDIS_URL=redis://redis:6379/0

# JWT
JWT_SECRET=your-32-character-minimum-secret-key

# App
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

---

## Quick Reference Commands

| Task | Command |
|------|---------|
| Check container status | `docker ps -a --filter "name=hay2010"` |
| View app logs | `docker logs hay2010_stock --tail 100 -f` |
| Check health | `curl http://localhost:3000/api/health` |
| Test Redis | `docker exec hay2010_redis redis-cli ping` |
| Test database | `docker exec hay2010_postgres pg_isready` |
| List users | `docker exec hay2010_postgres psql -U postgres -d hay2010_db -c "SELECT email FROM \"User\";"` |
| Restart all | `docker-compose -f stock_app/docker-compose.yml restart` |
| Full reset | `docker-compose -f stock_app/docker-compose.yml down -v && docker-compose -f stock_app/docker-compose.yml up -d` |

---

## Next Steps

If the issue persists after following this guide:

1. Run the **Quick Health Check** command at the top
2. Save the output to a file: `diagnostics_$(date +%Y%m%d).txt`
3. Check for specific error messages in the logs
4. Verify the `.env.docker` file has all required variables
5. Consider enabling debug logging: `DEBUG=* docker-compose up`

---

*Last updated: 2024-01-15*
