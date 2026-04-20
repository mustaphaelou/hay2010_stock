#!/bin/sh
# Local database restore for HAY2010 Stock Application
# Usage: ./scripts/local-restore.sh <backup_file.sql>

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <backup_file.sql>"
  exit 1
fi

if [ ! -f "$1" ]; then
  echo "ERROR: File not found: $1"
  exit 1
fi

echo "Restoring hay2010_db from $1..."
echo "WARNING: This will drop and recreate the database!"

cat "$1" | docker exec -i hay2010_postgres psql -U postgres hay2010_db

echo "Restore completed from: $1"
