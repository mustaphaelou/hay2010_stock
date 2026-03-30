-- =====================================================
-- MIGRATION: Add Missing Users Columns and Indexes
-- Date: 2026-03-30
-- Description: Fixes critical schema drift issues:
-- 1. Missing updatedAt column in users table
-- 2. Missing VARCHAR constraints on users table
-- 3. Missing index on produits (est_actif, en_sommeil)
-- 4. Missing index on mouvements_stock (id_produit, id_entrepot, date_mouvement)
-- =====================================================

-- =====================================================
-- 1. ADD MISSING updatedAt COLUMN TO USERS TABLE
-- =====================================================

-- Add updatedAt column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'updatedAt'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- =====================================================
-- 2. CONVERT TEXT COLUMNS TO VARCHAR(255) FOR CONSISTENCY
-- =====================================================

-- These are already defined as VARCHAR(255) in the schema but were created as TEXT
ALTER TABLE "users" ALTER COLUMN "email" TYPE VARCHAR(255);
ALTER TABLE "users" ALTER COLUMN "password" TYPE VARCHAR(255);
ALTER TABLE "users" ALTER COLUMN "name" TYPE VARCHAR(255);

-- =====================================================
-- 3. ADD MISSING INDEXES FOR PERFORMANCE
-- =====================================================

-- Products: composite index for active/sleeping filter
CREATE INDEX IF NOT EXISTS produits_est_actif_en_sommeil_idx ON produits(est_actif, en_sommeil);

-- Stock movements: composite index for product/warehouse/date queries
CREATE INDEX IF NOT EXISTS mouvements_stock_produit_entrepot_date_idx ON mouvements_stock(id_produit, id_entrepot, date_mouvement);
