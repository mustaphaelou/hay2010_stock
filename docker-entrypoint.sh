#!/bin/bash
set -e

echo "=== Starting deployment ==="
echo "Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"

echo "Running Prisma migrations..."
# Skip migrations if DATABASE_URL is not set or migrations already applied
if [ -n "$DATABASE_URL" ]; then
    echo "Checking database connection..."
    max_retries=10
    retry_count=0
    
    while [ $retry_count -lt $max_retries ]; do
        if npx prisma migrate deploy --schema=/app/prisma/schema.prisma; then
            echo "Migrations completed successfully!"
            break
        fi
        retry_count=$((retry_count + 1))
        echo "Migration attempt $retry_count failed, retrying in 3 seconds..."
        sleep 3
    done
    
    if [ $retry_count -eq $max_retries ]; then
        echo "Warning: Migrations failed after $max_retries attempts, proceeding anyway..."
    fi
else
    echo "Warning: DATABASE_URL not set, skipping migrations"
fi

echo "Starting application..."
exec node server.js
