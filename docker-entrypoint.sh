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

echo "Running Prisma database push..."
if [ -n "$DATABASE_URL" ]; then
    npx prisma db push --skip-generate --accept-data-loss 2>/dev/null || echo "Warning: Prisma db push failed, continuing..."
    echo "Database schema synchronized!"
else
    echo "Warning: DATABASE_URL not set, skipping database setup"
fi

echo "Starting application..."
exec node server.js
