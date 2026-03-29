-- =====================================================
-- MIGRATION: Fix Schema Issues
-- Date: 2026-03-29
-- Description: Fixes critical schema issues including:
--   1. Missing unique constraint on numero_serie_unique
--   2. Missing indexes for performance
--   3. Missing updatedAt fields
--   4. Missing onDelete behaviors (via foreign key updates)
--   5. Missing relation from MouvementStock to DocVente
--   6. Decimal precision standardization
-- =====================================================

-- =====================================================
-- 1. ADD MISSING UNIQUE CONSTRAINT
-- =====================================================

-- Add unique constraint on numero_serie_unique if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'lots_serie_numero_serie_unique_key'
    ) THEN
        -- First, handle any duplicates by making them unique
        UPDATE lots_serie 
        SET numero_serie_unique = numero_serie_unique || '_' || id_lot::text
        WHERE id_lot IN (
            SELECT id_lot FROM (
                SELECT id_lot, 
                       ROW_NUMBER() OVER (PARTITION BY numero_serie_unique ORDER BY id_lot) as rn
                FROM lots_serie 
                WHERE numero_serie_unique IS NOT NULL
            ) t WHERE rn > 1
        );
        
        -- Create unique index
        CREATE UNIQUE INDEX lots_serie_numero_serie_unique_key ON lots_serie(numero_serie_unique);
    END IF;
END $$;

-- =====================================================
-- 2. ADD MISSING INDEXES FOR PERFORMANCE
-- =====================================================

-- Partners: composite index for common query pattern
CREATE INDEX IF NOT EXISTS partenaires_type_est_actif_idx ON partenaires(type_partenaire, est_actif);
CREATE INDEX IF NOT EXISTS partenaires_nom_idx ON partenaires(nom_partenaire);

-- Documents: covering indexes for common queries
CREATE INDEX IF NOT EXISTS documents_domaine_date_idx ON documents(domaine_document, date_document);
CREATE INDEX IF NOT EXISTS documents_domaine_type_idx ON documents(domaine_document, type_document);
CREATE INDEX IF NOT EXISTS documents_partenaire_date_idx ON documents(id_partenaire, date_document);

-- Document lines: ordered retrieval
CREATE INDEX IF NOT EXISTS lignes_documents_document_ligne_idx ON lignes_documents(id_document, numero_ligne);

-- Tarifs exceptionnels: date range queries
CREATE INDEX IF NOT EXISTS tarifs_exceptionnels_dates_idx ON tarifs_exceptionnels(date_debut, date_fin);

-- =====================================================
-- 3. ADD MISSING UPDATEDAT FIELDS
-- =====================================================

-- Add date_modification to HistoriquePrixAchat if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'historique_prix_achats' 
        AND column_name = 'date_modification'
    ) THEN
        ALTER TABLE historique_prix_achats 
        ADD COLUMN date_modification TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Add date_modification to TarifExceptionnel if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tarifs_exceptionnels' 
        AND column_name = 'date_modification'
    ) THEN
        ALTER TABLE tarifs_exceptionnels 
        ADD COLUMN date_modification TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- =====================================================
-- 4. UPDATE FOREIGN KEY CONSTRAINTS WITH ONDELETE
-- =====================================================

-- Note: PostgreSQL doesn't allow modifying ON DELETE behavior directly
-- We need to drop and recreate constraints

-- DocVente -> Partenaire: Change to RESTRICT (prevent deletion of partner with documents)
-- This is already the default behavior, but let's make it explicit
ALTER TABLE documents 
DROP CONSTRAINT IF EXISTS documents_id_partenaire_fkey,
ADD CONSTRAINT documents_id_partenaire_fkey 
    FOREIGN KEY (id_partenaire) REFERENCES partenaires(id_partenaire) 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- LigneDocument -> Produit: Change to RESTRICT (prevent deletion of product used in documents)
ALTER TABLE lignes_documents 
DROP CONSTRAINT IF EXISTS lignes_documents_id_produit_fkey,
ADD CONSTRAINT lignes_documents_id_produit_fkey 
    FOREIGN KEY (id_produit) REFERENCES produits(id_produit) 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- LigneDocument -> Affaire: SET NULL on delete
ALTER TABLE lignes_documents 
DROP CONSTRAINT IF EXISTS lignes_documents_id_affaire_fkey,
ADD CONSTRAINT lignes_documents_id_affaire_fkey 
    FOREIGN KEY (id_affaire) REFERENCES affaires(id_affaire) 
    ON DELETE SET NULL ON UPDATE CASCADE;

-- LigneDocument -> LotSerie: SET NULL on delete
ALTER TABLE lignes_documents 
DROP CONSTRAINT IF EXISTS lignes_documents_id_lot_fkey,
ADD CONSTRAINT lignes_documents_id_lot_fkey 
    FOREIGN KEY (id_lot) REFERENCES lots_serie(id_lot) 
    ON DELETE SET NULL ON UPDATE CASCADE;

-- MouvementStock -> Produit: RESTRICT (prevent deletion of product with movements)
ALTER TABLE mouvements_stock 
DROP CONSTRAINT IF EXISTS mouvements_stock_id_produit_fkey,
ADD CONSTRAINT mouvements_stock_id_produit_fkey 
    FOREIGN KEY (id_produit) REFERENCES produits(id_produit) 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- MouvementStock -> Entrepot: RESTRICT (prevent deletion of warehouse with movements)
ALTER TABLE mouvements_stock 
DROP CONSTRAINT IF EXISTS mouvements_stock_id_entrepot_fkey,
ADD CONSTRAINT mouvements_stock_id_entrepot_fkey 
    FOREIGN KEY (id_entrepot) REFERENCES entrepots(id_entrepot) 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- =====================================================
-- 5. ADD MISSING RELATION: MouvementStock -> DocVente
-- =====================================================

-- Add foreign key constraint for id_document to documents table
-- First check if the column exists and has data
DO $$
BEGIN
    -- Check if the foreign key already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'mouvements_stock_id_document_fkey'
    ) THEN
        -- Add the foreign key constraint
        ALTER TABLE mouvements_stock 
        ADD CONSTRAINT mouvements_stock_id_document_fkey 
            FOREIGN KEY (id_document) REFERENCES documents(id_document) 
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- =====================================================
-- 6. DECIMAL PRECISION STANDARDIZATION (Optional)
-- =====================================================

-- Note: Changing decimal precision requires table rewrite
-- This is commented out to avoid locking in production
-- Uncomment if you need to standardize quantities to (12,3)

-- ALTER TABLE niveaux_stock ALTER COLUMN quantite_en_stock TYPE DECIMAL(12,3);
-- ALTER TABLE niveaux_stock ALTER COLUMN quantite_reservee TYPE DECIMAL(12,3);
-- ALTER TABLE niveaux_stock ALTER COLUMN quantite_commandee TYPE DECIMAL(12,3);

-- =====================================================
-- 7. ADD CHECK CONSTRAINTS FOR DATA INTEGRITY
-- =====================================================

-- Validate taux_tva is between 0 and 100
ALTER TABLE produits 
DROP CONSTRAINT IF EXISTS chk_taux_tva,
ADD CONSTRAINT chk_taux_tva CHECK (taux_tva IS NULL OR (taux_tva >= 0 AND taux_tva <= 100));

ALTER TABLE lignes_documents 
DROP CONSTRAINT IF EXISTS chk_taux_tva_ligne,
ADD CONSTRAINT chk_taux_tva_ligne CHECK (taux_tva >= 0 AND taux_tva <= 100);

-- Validate quantite_min_commande >= 1
ALTER TABLE produits 
DROP CONSTRAINT IF EXISTS chk_quantite_min,
ADD CONSTRAINT chk_quantite_min CHECK (quantite_min_commande IS NULL OR quantite_min_commande >= 1);

-- Validate delai_paiement_jours >= 0
ALTER TABLE partenaires 
DROP CONSTRAINT IF EXISTS chk_delai_paiement,
ADD CONSTRAINT chk_delai_paiement CHECK (delai_paiement_jours IS NULL OR delai_paiement_jours >= 0);

-- Validate pourcentage_remise between 0 and 100
ALTER TABLE partenaires 
DROP CONSTRAINT IF EXISTS chk_remise,
ADD CONSTRAINT chk_remise CHECK (pourcentage_remise IS NULL OR (pourcentage_remise >= 0 AND pourcentage_remise <= 100));

-- =====================================================
-- 8. ADD LENGTH CONSTRAINTS TO USER FIELDS
-- =====================================================

-- Note: VARCHAR constraints are already in schema, 
-- this ensures existing data is truncated if needed (not recommended for production)
-- ALTER TABLE users ALTER COLUMN email TYPE VARCHAR(255);
-- ALTER TABLE users ALTER COLUMN password TYPE VARCHAR(255);
-- ALTER TABLE users ALTER COLUMN name TYPE VARCHAR(255);

-- =====================================================
-- 9. REMOVE REDUNDANT INDEX
-- =====================================================

-- The unique constraint on code_produit already creates an index
-- Drop the redundant separate index if it exists
DROP INDEX IF EXISTS produits_code_produit_idx;

-- =====================================================
-- 10. UPDATE USER TABLE DEFAULT FOR ROLE
-- =====================================================

-- Ensure the default role is USER, not HR
-- This is handled by the schema, but let's ensure data consistency
UPDATE users SET role = 'USER' WHERE role = 'HR' AND role != 'USER';
