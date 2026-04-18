#!/bin/sh
# ============================================
# HAY2010 Stock Application Entrypoint
# Version: 3.0 (Optimized for Stability)
# ============================================
# Features:
# - Docker Secrets validation
# - Database connectivity check
# - Redis connectivity check
# - Graceful shutdown handling
# - Fail-fast on missing secrets
# ============================================
# shellcheck disable=SC2034
# shellcheck disable=SC2086

set -e

echo "============================================"
echo "HAY2010 Stock Application"
echo "============================================"
echo "Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "Node Version: $(node --version)"
echo "Platform: $(uname -a)"
echo "Environment: ${NODE_ENV:-production}"
echo "============================================"
echo ""

# =====================================================
# SECRETS VALIDATION
# =====================================================
echo "Validating Docker Secrets..."

SECRETS_DIR="${SECRETS_DIR:-/run/secrets}"
SECRETS_VALID=true

# Check required secrets
for secret in jwt_secret postgres_password redis_password; do
    secret_path="${SECRETS_DIR}/${secret}"
    if [ -f "$secret_path" ]; then
        echo "  ✓ ${secret} found"
    else
        echo "  ✗ ${secret} NOT FOUND"
        SECRETS_VALID=false
    fi
done

if [ "$SECRETS_VALID" = "false" ]; then
    echo ""
    echo "ERROR: Required secrets are missing!"
    echo ""
    echo "Please ensure Docker Secrets are configured:"
    echo "  1. Generate secrets: cd secrets && ./generate-secrets.sh"
    echo "  2. Restart containers: docker-compose down && docker-compose up -d"
    echo ""
    exit 1
fi

echo ""
echo "All secrets validated successfully."
echo ""

# =====================================================
# GRACEFUL SHUTDOWN HANDLER
# =====================================================
NODE_PID=""

shutdown_handler() {
    echo ""
    echo "============================================"
    echo "Received shutdown signal"
    echo "Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
    echo "Initiating graceful shutdown..."
    echo "============================================"
    echo ""

    if [ -n "$NODE_PID" ]; then
        echo "Stopping Node.js server (PID: $NODE_PID)..."

        # Send SIGTERM for graceful shutdown
        kill -TERM "$NODE_PID" 2>/dev/null || true

        # Wait up to 30 seconds for graceful shutdown
        TIMEOUT=30
        COUNTER=0
        while [ $COUNTER -lt $TIMEOUT ]; do
            if ! kill -0 "$NODE_PID" 2>/dev/null; then
                echo "Server stopped gracefully after ${COUNTER}s"
                exit 0
            fi
            COUNTER=$((COUNTER + 1))
            sleep 1
        done

        echo "Timeout reached, forcing shutdown..."
        kill -KILL "$NODE_PID" 2>/dev/null || true
    fi

    echo "Shutdown complete"
    exit 0
}

# Register signal handlers
trap shutdown_handler SIGTERM SIGINT

# =====================================================
# DATABASE CONNECTIVITY CHECK
# =====================================================
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_TIMEOUT="${DB_TIMEOUT:-60}"

echo "Waiting for database connection..."
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Timeout: ${DB_TIMEOUT}s"
echo ""

max_retries=$((DB_TIMEOUT / 2))
retry_count=0

while [ $retry_count -lt $max_retries ]; do
    if nc -z -w1 "$DB_HOST" "$DB_PORT" 2>/dev/null; then
        echo "✓ Database connection verified (attempt $((retry_count + 1))/$max_retries)"
        break
    fi
    retry_count=$((retry_count + 1))
    echo "Waiting for database... (attempt $retry_count/$max_retries)"
    sleep 2
done

if [ $retry_count -eq $max_retries ]; then
    echo ""
    echo "⚠ Warning: Could not verify database connectivity after $max_retries attempts"
    echo "Proceeding anyway - application will handle retries internally"
    echo ""
fi

# =====================================================
# REDIS CONNECTIVITY CHECK
# =====================================================
REDIS_HOST="${REDIS_HOST:-redis}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_TIMEOUT="${REDIS_TIMEOUT:-30}"

echo ""
echo "Waiting for Redis connection..."
echo "  Host: $REDIS_HOST"
echo "  Port: $REDIS_PORT"
echo "  Timeout: ${REDIS_TIMEOUT}s"
echo ""

max_redis_retries=$((REDIS_TIMEOUT / 2))
redis_retry_count=0

while [ $redis_retry_count -lt $max_redis_retries ]; do
    if nc -z -w1 "$REDIS_HOST" "$REDIS_PORT" 2>/dev/null; then
        echo "✓ Redis connection verified (attempt $((redis_retry_count + 1))/$max_redis_retries)"
        break
    fi
    redis_retry_count=$((redis_retry_count + 1))
    echo "Waiting for Redis... (attempt $redis_retry_count/$max_redis_retries)"
    sleep 2
done

if [ $redis_retry_count -eq $max_redis_retries ]; then
    echo ""
    echo "⚠ Warning: Could not verify Redis connectivity after $max_redis_retries attempts"
    echo "Proceeding anyway - application will handle retries internally"
    echo ""
fi

# =====================================================
# START APPLICATION
# =====================================================
echo ""
echo "============================================"
echo "Starting Next.js Server"
echo "============================================"
echo "Port: ${PORT:-3000}"
echo "Host: ${HOSTNAME:-0.0.0.0}"
echo ""

# Start Node.js in background to handle signals
node server.js &
NODE_PID=$!

echo "Server started with PID: $NODE_PID"
echo ""
echo "============================================"
echo "Application Ready"
echo "============================================"
echo ""

# Wait for Node.js process
wait $NODE_PID
NODE_EXIT_CODE=$?

echo ""
echo "Server exited with code: $NODE_EXIT_CODE"
exit $NODE_EXIT_CODE
