# Coolify Deployment Guide

## Problem
Coolify injects build arguments into the Dockerfile in a way that breaks multi-stage builds with digest-pinned base images. This causes the HEALTHCHECK instruction to not be properly applied to the final image.

## Solution
This repository includes a Coolify-optimized Dockerfile (`Dockerfile.coolify`) that:

1. **Uses simple base image references** (no SHA256 digests) to prevent Coolify's ARG injection from breaking the FROM statements
2. **Defines HEALTHCHECK with hardcoded port** (3000) to avoid variable expansion issues
3. **Uses a cleaner structure** that's less prone to corruption by Coolify's modifications

## Deployment Steps

### 1. Configure Coolify Environment Variables

In your Coolify application dashboard, go to **Configuration → Environment Variables**:

**IMPORTANT**: For ALL secret variables, **uncheck "Available at Buildtime"**:

- `DATABASE_URL`
- `POSTGRES_PASSWORD`
- `REDIS_PASSWORD` or `REDIS_URL`
- `JWT_SECRET`

These should ONLY be available at **Runtime**.

**Why?** Coolify's build-time ARG injection breaks the Dockerfile structure when using digest-pinned images.

### 2. Set Runtime Variables

Ensure these variables are set as **Runtime only**:

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@postgres:5432/hay2010_db
REDIS_URL=redis://:YOUR_PASSWORD@redis:6379/0
JWT_SECRET=your-jwt-secret
POSTGRES_PASSWORD=YOUR_PASSWORD
REDIS_PASSWORD=YOUR_PASSWORD
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

### 3. Build Settings

In Coolify, go to **Configuration → Build Settings**:

- **Build Pack**: Docker Compose
- **Docker Compose Location**: `docker-compose.yaml`
- The compose file references `Dockerfile.coolify` explicitly

### 4. Health Check Configuration

The `docker-compose.yaml` and `Dockerfile.coolify` both define health checks:

- **Test**: `curl -f http://localhost:3000/api/health`
- **Interval**: 30s
- **Timeout**: 10s
- **Retries**: 3
- **Start Period**: 90s (increased to allow full startup)

In Coolify, you can either:
- **Option A**: Disable custom health check (let it use the compose/Dockerfile health check)
- **Option B**: Manually configure it to match the above settings

### 5. Deploy

Click **Deploy** in Coolify. The build should now succeed without health check errors.

## Files

- **`Dockerfile.coolify`** - Optimized for Coolify deployment (use this one)
- **`Dockerfile`** - Production-grade with SHA256 digests (for other platforms)
- **`docker-compose.yaml`** - Coolify-specific compose file
- **`docker-compose.yml`** - Local development with full stack
- **`docker-compose.prod.yml`** - Production compose for manual deployment

## Troubleshooting

### Health Check Failing

If you see: `map has no entry for key "Health"`

**Cause**: Coolify corrupted the Dockerfile's HEALTHCHECK instruction

**Solution**: 
1. Ensure you're using `Dockerfile.coolify` (check docker-compose.yaml)
2. Verify all secrets are **Runtime only** (not Buildtime)
3. Redeploy

### Database Connection Issues

If the app can't connect to the database:

1. Verify `DATABASE_URL` is set correctly with the Coolify-managed database hostname
2. Check that PostgreSQL is running in Coolify
3. Ensure the database and app are in the same network

### Build Failures

If the build fails:

1. Check Coolify logs for the modified Dockerfile output
2. Look for malformed ARG statements (e.g., `ARG REDIS_URL=...AS builder`)
3. If you see this, ensure you're using `Dockerfile.coolify`

## Manual Deployment Alternative

If Coolify continues to have issues, you can deploy manually:

```bash
# Build and run with production compose
docker-compose -f docker-compose.prod.yml up -d --build

# Or use the Coolify-optimized compose
docker-compose -f docker-compose.yaml up -d --build
```

## Security Notes

- The `Dockerfile.coolify` sacrifices some security (no digest pinning) for Coolify compatibility
- For maximum security in other environments, use the main `Dockerfile`
- All secrets should be runtime-only, never build-time
- The non-root user and security contexts are still maintained

## Support

If issues persist:
1. Check Coolify version (update if needed)
2. Review Coolify's build logs for the modified Dockerfile
3. Consider opening an issue in the Coolify repository if this is a bug
