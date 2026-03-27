#!/bin/sh
set -e

echo "=== Starting application ==="
echo "Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"

echo "Waiting for database to be ready..."
max_retries=30
retry_count=0

while [ $retry_count -lt $max_retries ]; do
  if nc -z ${DB_HOST:-postgres} ${DB_PORT:-5432} 2>/dev/null; then
    echo "Database port is open!"
    break
  fi
  retry_count=$((retry_count + 1))
  echo "Waiting for database... (attempt $retry_count/$max_retries)"
  sleep 2
done

if [ $retry_count -eq $max_retries ]; then
  echo "Warning: Could not connect to database port, proceeding anyway..."
fi

# Note: Database migrations are handled by the 'migrate' service in docker-compose
# This ensures migrations run before the app starts

echo "Starting Next.js server..."
exec node server.js
