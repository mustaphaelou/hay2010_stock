#!/bin/sh
# ============================================
# HAY2010 Stock Application - Local Entrypoint
# Version: 3.0
# ============================================
#
# PURPOSE:
#   Entrypoint script for local Docker deployment
#   Does NOT require Docker secrets - uses env vars directly
#
# FEATURES:
#   - Database connectivity check
#   - Graceful shutdown handling
#   - Environment validation
#
# ============================================

set -e

echo "============================================"
echo "HAY2010 Stock Application (Local Docker)"
echo "============================================"
echo "Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "Node Version: $(node --version)"
echo "Platform: $(uname -a)"
echo "Environment: ${NODE_ENV:-production}"
echo "============================================"
echo ""

# ============================================
# ENVIRONMENT VALIDATION
# ============================================
echo "Validating environment..."

if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL environment variable is required"
    exit 1
fi

echo "✓ Database URL configured"
echo ""

# ============================================
# GRACEFUL SHUTDOWN HANDLER
# ============================================
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

trap shutdown_handler SIGTERM SIGINT

# ============================================
# DATABASE CONNECTIVITY CHECK
# ============================================
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_TIMEOUT="${DB_TIMEOUT:-60}"

echo "Waiting for database connection..."
echo " Host: $DB_HOST"
echo " Port: $DB_PORT"
echo " Timeout: ${DB_TIMEOUT}s"
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

# ============================================
# REDIS CONNECTIVITY CHECK
# ============================================
REDIS_HOST="${REDIS_HOST:-redis}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_TIMEOUT="${REDIS_TIMEOUT:-30}"

echo ""
echo "Waiting for Redis connection..."
echo " Host: $REDIS_HOST"
echo " Port: $REDIS_PORT"
echo " Timeout: ${REDIS_TIMEOUT}s"
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

# ============================================
# START APPLICATION
# ============================================
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
echo "Access the application at: http://localhost:${PORT:-3000}"
echo "API Health check: http://localhost:${PORT:-3000}/api/health/public"
echo "Admin health check (requires auth): http://localhost:${PORT:-3000}/api/health"
echo ""

# Wait for Node.js process
wait $NODE_PID
NODE_EXIT_CODE=$?

echo ""
echo "Server exited with code: $NODE_EXIT_CODE"
exit $NODE_EXIT_CODE