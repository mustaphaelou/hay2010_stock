#!/bin/sh
# Local database backup for HAY2010 Stock Application
# Usage: ./scripts/local-backup.sh

set -e

BACKUP_DIR="${BACKUP_DIR:-.}"
BACKUP_FILE="${BACKUP_DIR}/backup_$(date +%Y%m%d_%H%M%S).sql"

echo "Backing up hay2010_db to ${BACKUP_FILE}..."

docker exec hay2010_postgres pg_dump -U postgres hay2010_db > "$BACKUP_FILE"

echo "Backup completed: ${BACKUP_FILE}"
echo "Size: $(du -h "$BACKUP_FILE" | cut -f1)"
