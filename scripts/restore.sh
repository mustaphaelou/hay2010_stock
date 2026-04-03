#!/bin/bash

BACKUP_FILE="${1}"
BACKUP_DIR="/backups"

PGHOST="${POSTGRES_HOST:-postgres}"
PGPORT="${POSTGRES_PORT:-5432}"
PGUSER="${POSTGRES_USER:-postgres}"
PGDATABASE="${POSTGRES_DB:-hay2010_db}"

if [ -z "${BACKUP_FILE}" ]; then
  echo "Usage: $0 <backup_file>"
  echo "Available backups:"
  ls -lh "${BACKUP_DIR}"/hay2010_backup_*.sql.gz 2>/dev/null || echo "No backups found"
  exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Error: Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

echo "WARNING: This will overwrite the current database!"
echo "Target: ${PGDATABASE} on ${PGHOST}:${PGPORT}"
read -p "Are you sure? (yes/no): " CONFIRM

if [ "${CONFIRM}" != "yes" ]; then
  echo "Restore cancelled"
  exit 0
fi

PGPASSWORD="${POSTGRES_PASSWORD}"
export PGPASSWORD

echo "Terminating existing connections..."
psql \
  -h "${PGHOST}" \
  -p "${PGPORT}" \
  -U "${PGUSER}" \
  -d postgres \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${PGDATABASE}' AND pid <> pg_backend_pid();"

echo "Dropping and recreating database..."
psql \
  -h "${PGHOST}" \
  -p "${PGPORT}" \
  -U "${PGUSER}" \
  -d postgres \
  -c "DROP DATABASE IF EXISTS ${PGDATABASE};"
psql \
  -h "${PGHOST}" \
  -p "${PGPORT}" \
  -U "${PGUSER}" \
  -d postgres \
  -c "CREATE DATABASE ${PGDATABASE};"

echo "Restoring from backup: ${BACKUP_FILE}"
gunzip -c "${BACKUP_FILE}" | psql \
  -h "${PGHOST}" \
  -p "${PGPORT}" \
  -U "${PGUSER}" \
  -d "${PGDATABASE}" \
  -v ON_ERROR_STOP=1 \
  --quiet

unset PGPASSWORD

echo "Restore completed successfully"
