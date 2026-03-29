-- Add performance indexes for stock and document queries
-- These indexes optimize the N+1 query fix and common query patterns

-- Composite index for stock level queries (product + warehouse)
CREATE INDEX IF NOT EXISTS idx_niveaux_stock_product_warehouse ON niveaux_stock(id_produit, id_entrepot);

-- Index for stock movements by product and date (for stock history)
CREATE INDEX IF NOT EXISTS idx_mouvements_stock_product_date ON mouvements_stock(id_produit, date_mouvement DESC);

-- Composite index for movements by warehouse and product
CREATE INDEX IF NOT EXISTS idx_mouvements_stock_warehouse_product ON mouvements_stock(id_entrepot, id_produit);

-- Index for document queries by domaine and date (sales/purchases list)
CREATE INDEX IF NOT EXISTS idx_documents_domaine_date ON documents(domaine_document, date_document DESC);

-- Index for documents by partner (customer/supplier documents)
CREATE INDEX IF NOT EXISTS idx_documents_partenaire_date ON documents(id_partenaire, date_document DESC);

-- Index for document lines by document (for document details)
CREATE INDEX IF NOT EXISTS idx_lignes_document_document ON lignes_documents(id_document, numero_ligne);

-- Index for products by active status (for product listings)
CREATE INDEX IF NOT EXISTS idx_produits_active ON produits(est_actif, en_sommeil);
