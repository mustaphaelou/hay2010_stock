#!/bin/sh
# ============================================
# HAY2010 Stock Application - Entrypoint
# Version: 5.0
# ============================================
#
# FEATURES:
#   - Environment validation
#   - Automatic database migrations
#   - Graceful shutdown handling
#
# ============================================

set -e

echo "============================================"
echo "HAY2010 Stock Application"
echo "============================================"
echo "Timestamp:  $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "Node:       $(node --version)"
echo "Platform:   $(uname -a)"
echo "Env:        ${NODE_ENV:-production}"
echo "============================================"
echo ""

# ============================================
# ENVIRONMENT VALIDATION
# ============================================
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL environment variable is required"
    exit 1
fi

echo "? DATABASE_URL configured"

# ============================================
# DATABASE MIGRATIONS
# ============================================
echo ""
echo "Running database migrations..."
npx prisma migrate deploy
MIGRATE_EXIT=$?

if [ $MIGRATE_EXIT -ne 0 ]; then
    echo "ERROR: Database migration failed (exit code: $MIGRATE_EXIT)"
    echo "Ensure PostgreSQL is healthy and DATABASE_URL is correct."
    exit $MIGRATE_EXIT
fi

echo "? Migrations applied successfully"
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
# START APPLICATION
# ============================================
echo "============================================"
echo "Starting Next.js Server"
echo "============================================"
echo "Port: ${PORT:-3000}"
echo "Host: ${HOSTNAME:-0.0.0.0}"
echo ""

node server.js &
NODE_PID=$!

echo "Server started with PID: $NODE_PID"
echo ""
echo "============================================"
echo "Application Ready"
echo "============================================"
echo ""
echo "Health check: http://localhost:${PORT:-3000}/api/health/public"
echo ""

wait $NODE_PID
NODE_EXIT_CODE=$?

echo ""
echo "Server exited with code: $NODE_EXIT_CODE"
exit $NODE_EXIT_CODE
