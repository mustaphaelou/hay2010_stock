-- Enable pg_trgm extension for trigram text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =====================================================
-- GIN Trigram Indexes on Produits (Products)
-- =====================================================

-- Accelerates: code_produit: { contains, mode: 'insensitive' }
CREATE INDEX IF NOT EXISTS idx_produits_code_produit_trgm ON produits USING gin (code_produit gin_trgm_ops);

-- Accelerates: nom_produit: { contains, mode: 'insensitive' }
CREATE INDEX IF NOT EXISTS idx_produits_nom_produit_trgm ON produits USING gin (nom_produit gin_trgm_ops);

-- Accelerates: code_barre_ean: { contains, mode: 'insensitive' }
CREATE INDEX IF NOT EXISTS idx_produits_code_barre_ean_trgm ON produits USING gin (code_barre_ean gin_trgm_ops);

-- =====================================================
-- GIN Trigram Indexes on Partenaires (Partners)
-- =====================================================

-- Accelerates: nom_partenaire: { contains, mode: 'insensitive' }
CREATE INDEX IF NOT EXISTS idx_partenaires_nom_partenaire_trgm ON partenaires USING gin (nom_partenaire gin_trgm_ops);

-- Accelerates: code_partenaire: { contains, mode: 'insensitive' }
CREATE INDEX IF NOT EXISTS idx_partenaires_code_partenaire_trgm ON partenaires USING gin (code_partenaire gin_trgm_ops);

-- Accelerates: ville: { contains, mode: 'insensitive' }
CREATE INDEX IF NOT EXISTS idx_partenaires_ville_trgm ON partenaires USING gin (ville gin_trgm_ops);

-- =====================================================
-- GIN Trigram Indexes on Documents (Sales Documents)
-- =====================================================

-- Accelerates: numero_document: { contains, mode: 'insensitive' }
CREATE INDEX IF NOT EXISTS idx_documents_numero_document_trgm ON documents USING gin (numero_document gin_trgm_ops);

-- Accelerates: nom_partenaire_snapshot: { contains, mode: 'insensitive' }
CREATE INDEX IF NOT EXISTS idx_documents_nom_partenaire_snapshot_trgm ON documents USING gin (nom_partenaire_snapshot gin_trgm_ops);

-- Accelerates: reference_externe: { contains, mode: 'insensitive' }
CREATE INDEX IF NOT EXISTS idx_documents_reference_externe_trgm ON documents USING gin (reference_externe gin_trgm_ops);
