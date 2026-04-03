#!/bin/bash

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/hay2010_backup_${TIMESTAMP}.sql.gz"

PGHOST="${POSTGRES_HOST:-postgres}"
PGPORT="${POSTGRES_PORT:-5432}"
PGUSER="${POSTGRES_USER:-postgres}"
PGDATABASE="${POSTGRES_DB:-hay2010_db}"

PGPASSWORD="${POSTGRES_PASSWORD}"

export PGPASSWORD

echo "Starting backup of ${PGDATABASE} at ${TIMESTAMP}"

mkdir -p "${BACKUP_DIR}"

pg_dump \
  -h "${PGHOST}" \
  -p "${PGPORT}" \
  -U "${PGUSER}" \
  -d "${PGDATABASE}" \
  --format=plain \
  --verbose \
  --no-owner \
  --no-acl \
  | gzip > "${BACKUP_FILE}"

BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)

echo "Backup completed: ${BACKUP_FILE}"
echo "Backup size: ${BACKUP_SIZE}"

unset PGPASSWORD

find "${BACKUP_DIR}" -name "hay2010_backup_*.sql.gz" -type f -mtime +30 -delete

echo "Old backups cleaned up"

if [ -n "${SLACK_WEBHOOK_URL}" ]; then
  curl -X POST "${SLACK_WEBHOOK_URL}" \
    -H 'Content-type: application/json' \
    -d "{\"text\":\"Database backup completed: ${BACKUP_FILE} (${BACKUP_SIZE})\"}"
fi
