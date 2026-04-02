#!/bin/sh
# ============================================
# HAY2010 Stock Application Entrypoint
# Version: 2.0.0
# Last Updated: 2026-04-01
# ============================================
# shellcheck disable=SC2034 # Unused variables for documentation
# shellcheck disable=SC2086 # Word splitting warnings

set -e

echo "=== Starting HAY2010 Stock Application ==="
echo "Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "Node Version: $(node --version)"
echo "Platform: $(uname -a)"

# Graceful shutdown handler
shutdown_handler() {
    echo ""
    echo "=== Received shutdown signal ==="
    echo "Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
    echo "Initiating graceful shutdown..."

    # Send SIGTERM to Node.js process (if running)
    if [ -n "$NODE_PID" ]; then
        echo "Stopping Node.js server (PID: $NODE_PID)..."
        kill -TERM $NODE_PID 2>/dev/null || true

        # Wait for graceful shutdown (max 30 seconds)
        TIMEOUT=30
        COUNTER=0
        while [ $COUNTER -lt $TIMEOUT ]; do
            if ! kill -0 $NODE_PID 2>/dev/null; then
                echo "Server stopped gracefully after ${COUNTER}s"
                exit 0
            fi
            COUNTER=$((COUNTER + 1))
            sleep 1
        done

        echo "Timeout reached, forcing shutdown..."
        kill -KILL $NODE_PID 2>/dev/null || true
    fi

    echo "Shutdown complete"
    exit 0
}

# Register signal handlers
trap shutdown_handler SIGTERM SIGINT

# Wait for database using BusyBox nc (available in Alpine)
echo "Waiting for database to be ready..."
max_retries=30
retry_count=0
db_host="${DB_HOST:-postgres}"
db_port="${DB_PORT:-5432}"

while [ $retry_count -lt $max_retries ]; do
    # Use BusyBox nc for TCP check (Alpine default)
    if nc -z -w1 "$db_host" "$db_port" 2>/dev/null; then
        echo "✓ Database connection verified (attempt $((retry_count + 1))/$max_retries)"
        break
    fi
    retry_count=$((retry_count + 1))
    echo "Waiting for database... (attempt $retry_count/$max_retries)"
    sleep 2
done

if [ $retry_count -eq $max_retries ]; then
    echo "⚠ Warning: Could not verify database connectivity after $max_retries attempts"
    echo "Proceeding anyway - application will retry connections..."
fi

# Note: Database migrations are handled by the 'migrate' service in docker-compose
# This ensures migrations run before the app starts

echo "Starting Next.js server..."
echo "Environment: ${NODE_ENV:-production}"
echo "Port: ${PORT:-3000}"

# Start Node.js in background to handle signals
node server.js &
NODE_PID=$!

# Wait for Node.js process
wait $NODE_PID
NODE_EXIT_CODE=$?

echo "Server exited with code: $NODE_EXIT_CODE"
exit $NODE_EXIT_CODE
