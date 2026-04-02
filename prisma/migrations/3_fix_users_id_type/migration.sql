-- =====================================================
-- MIGRATION: Fix Users Table ID Column Type
-- Date: 2026-03-31
-- Description: Fixes the mismatch between Prisma schema and database:
-- - Changes users.id from TEXT to UUID
-- - Updates existing user IDs to valid UUIDs
-- - Updates all foreign key references to UUID type
-- =====================================================

-- =====================================================
-- 1. UPDATE FOREIGN KEY COLUMNS TO UUID TYPE
-- =====================================================

-- First, update any existing foreign key references to valid UUID format
-- Using gen_random_uuid() to create valid UUIDs from existing TEXT values

-- Update partenaires.cree_par (cast to uuid, not text)
UPDATE partenaires
SET cree_par = gen_random_uuid()
WHERE cree_par IS NOT NULL AND cree_par::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Update partenaires.modifie_par
UPDATE partenaires
SET modifie_par = gen_random_uuid()
WHERE modifie_par IS NOT NULL AND modifie_par::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Update produits.cree_par
UPDATE produits
SET cree_par = gen_random_uuid()
WHERE cree_par IS NOT NULL AND cree_par::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Update produits.modifie_par
UPDATE produits
SET modifie_par = gen_random_uuid()
WHERE modifie_par IS NOT NULL AND modifie_par::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Update affaires.cree_par
UPDATE affaires
SET cree_par = gen_random_uuid()
WHERE cree_par IS NOT NULL AND cree_par::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Update affaires.modifie_par
UPDATE affaires
SET modifie_par = gen_random_uuid()
WHERE modifie_par IS NOT NULL AND modifie_par::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Update documents.cree_par
UPDATE documents
SET cree_par = gen_random_uuid()
WHERE cree_par IS NOT NULL AND cree_par::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Update documents.modifie_par
UPDATE documents
SET modifie_par = gen_random_uuid()
WHERE modifie_par IS NOT NULL AND modifie_par::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Update mouvements_stock.cree_par
UPDATE mouvements_stock
SET cree_par = gen_random_uuid()
WHERE cree_par IS NOT NULL AND cree_par::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- =====================================================
-- 2. DROP FOREIGN KEY CONSTRAINTS
-- =====================================================

ALTER TABLE partenaires DROP CONSTRAINT IF EXISTS partenaires_cree_par_fkey;
ALTER TABLE partenaires DROP CONSTRAINT IF EXISTS partenaires_modifie_par_fkey;
ALTER TABLE produits DROP CONSTRAINT IF EXISTS produits_cree_par_fkey;
ALTER TABLE produits DROP CONSTRAINT IF EXISTS produits_modifie_par_fkey;
ALTER TABLE affaires DROP CONSTRAINT IF EXISTS affaires_cree_par_fkey;
ALTER TABLE affaires DROP CONSTRAINT IF EXISTS affaires_modifie_par_fkey;
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_cree_par_fkey;
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_modifie_par_fkey;
ALTER TABLE mouvements_stock DROP CONSTRAINT IF EXISTS mouvements_stock_cree_par_fkey;

-- =====================================================
-- 3. CONVERT FOREIGN KEY COLUMNS TO UUID TYPE
-- =====================================================

-- Convert cree_par and modifie_par columns to UUID
ALTER TABLE partenaires ALTER COLUMN cree_par TYPE UUID USING (cree_par::UUID);
ALTER TABLE partenaires ALTER COLUMN modifie_par TYPE UUID USING (modifie_par::UUID);
ALTER TABLE produits ALTER COLUMN cree_par TYPE UUID USING (cree_par::UUID);
ALTER TABLE produits ALTER COLUMN modifie_par TYPE UUID USING (modifie_par::UUID);
ALTER TABLE affaires ALTER COLUMN cree_par TYPE UUID USING (cree_par::UUID);
ALTER TABLE affaires ALTER COLUMN modifie_par TYPE UUID USING (modifie_par::UUID);
ALTER TABLE documents ALTER COLUMN cree_par TYPE UUID USING (cree_par::UUID);
ALTER TABLE documents ALTER COLUMN modifie_par TYPE UUID USING (modifie_par::UUID);
ALTER TABLE mouvements_stock ALTER COLUMN cree_par TYPE UUID USING (cree_par::UUID);

-- =====================================================
-- 4. UPDATE EXISTING USER IDS TO VALID UUIDS
-- =====================================================

-- Update existing user IDs to valid UUIDs
UPDATE users SET id = gen_random_uuid()::text WHERE id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- =====================================================
-- 5. CONVERT USERS.ID TO UUID TYPE
-- =====================================================

-- Drop primary key constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey;

-- Convert id column to UUID
ALTER TABLE users ALTER COLUMN id TYPE UUID USING (id::UUID);

-- Recreate primary key
ALTER TABLE users ADD PRIMARY KEY (id);

-- =====================================================
-- 6. RECREATE FOREIGN KEY CONSTRAINTS
-- =====================================================

ALTER TABLE partenaires
ADD CONSTRAINT partenaires_cree_par_fkey
FOREIGN KEY (cree_par) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE partenaires
ADD CONSTRAINT partenaires_modifie_par_fkey
FOREIGN KEY (modifie_par) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE produits
ADD CONSTRAINT produits_cree_par_fkey
FOREIGN KEY (cree_par) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE produits
ADD CONSTRAINT produits_modifie_par_fkey
FOREIGN KEY (modifie_par) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE affaires
ADD CONSTRAINT affaires_cree_par_fkey
FOREIGN KEY (cree_par) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE affaires
ADD CONSTRAINT affaires_modifie_par_fkey
FOREIGN KEY (modifie_par) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE documents
ADD CONSTRAINT documents_cree_par_fkey
FOREIGN KEY (cree_par) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE documents
ADD CONSTRAINT documents_modifie_par_fkey
FOREIGN KEY (modifie_par) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE mouvements_stock
ADD CONSTRAINT mouvements_stock_cree_par_fkey
FOREIGN KEY (cree_par) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;
