#!/bin/bash
set -e

echo "=== Starting deployment ==="
echo "Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"

echo "Waiting for database to be ready..."
max_retries=30
retry_count=0

while [ $retry_count -lt $max_retries ]; do
    if npx prisma db pull --schema=/app/prisma/schema.prisma > /dev/null 2>&1; then
        echo "Database is ready!"
        break
    fi
    retry_count=$((retry_count + 1))
    echo "Waiting for database... (attempt $retry_count/$max_retries)"
    sleep 2
done

if [ $retry_count -eq $max_retries ]; then
    echo "Warning: Could not verify database connection, proceeding anyway..."
fi

echo "Running Prisma migrations..."
if ! npx prisma migrate deploy --schema=/app/prisma/schema.prisma; then
    echo "ERROR: Prisma migrations failed!"
    echo "Database may not be fully ready. Check DATABASE_URL and database status."
    exit 1
fi

echo "Migrations completed successfully!"
echo "Starting application..."
exec node server.js
