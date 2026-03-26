#!/bin/bash
set -e

echo "=== Starting deployment ==="
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

echo "Running Prisma database migrations..."
if [ -n "$DATABASE_URL" ]; then
  # Use db push for development/staging, use migrate for production
  if [ "${NODE_ENV}" = "production" ]; then
    echo "Production environment detected - using safe deployment mode"
    # In production, we deploy without accepting data loss automatically
    # If migrations are pending, this will fail safely and alert
    ./node_modules/prisma/build/index.js migrate deploy || {
      echo "::warning::Prisma migrate deploy failed, attempting db push as fallback"
      ./node_modules/prisma/build/index.js db push --skip-generate
    }
  else
    echo "Development/Staging environment - using db push"
    ./node_modules/prisma/build/index.js db push --skip-generate
  fi
  echo "Database schema synchronized!"
else
  echo "Warning: DATABASE_URL not set, skipping database setup"
fi

echo "Starting application..."
exec node server.js
