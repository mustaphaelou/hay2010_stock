-- =====================================================
-- MIGRATION: Add Missing User Columns
-- Date: 2026-04-27
-- Description: Adds columns present in Prisma schema but
-- missing from the database:
--   - lastLoginAt: tracks last login timestamp
--   - passwordChangedAt: tracks password rotation time
--   - isActive: soft-delete / account activation flag
-- =====================================================

-- Add isActive column with default true
ALTER TABLE users ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Add lastLoginAt column (nullable, no default)
ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);

-- Add passwordChangedAt column (nullable, no default)
ALTER TABLE users ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMP(3);
