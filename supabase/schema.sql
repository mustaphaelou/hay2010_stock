-- =====================================================
-- HAY2010 Sage 100 Commercial Clone - Complete Schema
-- Run this SQL in Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. PARTENAIRES (Clients & Fournisseurs)
-- =====================================================
CREATE TABLE partenaires (
    id_partenaire SERIAL PRIMARY KEY,
    code_partenaire VARCHAR(50) UNIQUE NOT NULL,
    nom_partenaire VARCHAR(255) NOT NULL,
    type_partenaire VARCHAR(20) NOT NULL CHECK (type_partenaire IN ('CLIENT', 'FOURNISSEUR', 'LES_DEUX')),
    adresse_email VARCHAR(255),
    numero_telephone VARCHAR(50),
    numero_fax VARCHAR(50),
    url_site_web VARCHAR(255),
    adresse_rue TEXT,
    code_postal VARCHAR(20),
    ville VARCHAR(100),
    pays VARCHAR(100) DEFAULT 'Maroc',
    numero_tva VARCHAR(50),
    numero_ice VARCHAR(50),
    numero_rc VARCHAR(50),
    delai_paiement_jours INT DEFAULT 30,
    limite_credit NUMERIC(15,2),
    pourcentage_remise NUMERIC(5,2) DEFAULT 0,
    numero_compte_bancaire VARCHAR(50),
    code_banque VARCHAR(20),
    numero_iban VARCHAR(50),
    code_swift VARCHAR(20),
    est_actif BOOLEAN DEFAULT TRUE,
    est_bloque BOOLEAN DEFAULT FALSE,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cree_par UUID,
    modifie_par UUID
);

-- Index for faster lookups
CREATE INDEX idx_partenaires_type ON partenaires(type_partenaire);
CREATE INDEX idx_partenaires_actif ON partenaires(est_actif);

-- =====================================================
-- 2. CATEGORIES PRODUITS (Familles)
-- =====================================================
CREATE TABLE categories_produits (
    id_categorie SERIAL PRIMARY KEY,
    code_categorie VARCHAR(50) UNIQUE NOT NULL,
    nom_categorie VARCHAR(255) NOT NULL,
    id_categorie_parent INT REFERENCES categories_produits(id_categorie),
    description_categorie TEXT,
    est_actif BOOLEAN DEFAULT TRUE,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categories_parent ON categories_produits(id_categorie_parent);

-- =====================================================
-- 3. ENTREPOTS (Dépôts de stockage)
-- =====================================================
CREATE TABLE entrepots (
    id_entrepot SERIAL PRIMARY KEY,
    code_entrepot VARCHAR(50) UNIQUE NOT NULL,
    nom_entrepot VARCHAR(255) NOT NULL,
    adresse_entrepot TEXT,
    ville_entrepot VARCHAR(100),
    code_postal_entrepot VARCHAR(20),
    capacite_totale_unites INT,
    nom_responsable VARCHAR(255),
    email_responsable VARCHAR(255),
    telephone_responsable VARCHAR(50),
    est_actif BOOLEAN DEFAULT TRUE,
    est_entrepot_principal BOOLEAN DEFAULT FALSE,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 4. PRODUITS (Articles)
-- =====================================================
CREATE TABLE produits (
    id_produit SERIAL PRIMARY KEY,
    code_produit VARCHAR(100) UNIQUE NOT NULL,
    nom_produit VARCHAR(500) NOT NULL,
    id_categorie INT REFERENCES categories_produits(id_categorie),
    famille VARCHAR(100),  -- For quick filtering like Sage
    description_produit TEXT,
    code_barre_ean VARCHAR(50),
    unite_mesure VARCHAR(20) DEFAULT 'U',
    poids_kg NUMERIC(10,3),
    volume_m3 NUMERIC(10,6),
    -- Prix
    prix_achat NUMERIC(15,4),           -- Prix d'achat standard
    prix_dernier_achat NUMERIC(15,4),   -- Dernier prix d'achat
    coefficient NUMERIC(8,4) DEFAULT 1.0,  -- Coefficient de marge
    prix_vente NUMERIC(15,4),           -- Prix de vente calculé ou fixé
    prix_gros NUMERIC(15,4),            -- Prix de gros
    taux_tva NUMERIC(5,2) DEFAULT 20.00,
    -- Stock
    quantite_min_commande INT DEFAULT 1,
    niveau_reappro_quantite INT DEFAULT 0,  -- Seuil de réappro
    stock_minimum INT DEFAULT 0,
    stock_maximum INT,
    activer_suivi_stock BOOLEAN DEFAULT TRUE,
    -- Fournisseur principal
    id_fournisseur_principal INT REFERENCES partenaires(id_partenaire),
    reference_fournisseur VARCHAR(100),
    delai_livraison_fournisseur_jours INT,
    -- Statut
    est_actif BOOLEAN DEFAULT TRUE,
    en_sommeil BOOLEAN DEFAULT FALSE,  -- Article en sommeil (inactif temporaire)
    est_abandonne BOOLEAN DEFAULT FALSE,
    -- Audit
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cree_par UUID,
    modifie_par UUID
);

CREATE INDEX idx_produits_categorie ON produits(id_categorie);
CREATE INDEX idx_produits_famille ON produits(famille);
CREATE INDEX idx_produits_fournisseur ON produits(id_fournisseur_principal);
CREATE INDEX idx_produits_actif ON produits(est_actif);
CREATE INDEX idx_produits_code ON produits(code_produit);

-- =====================================================
-- 5. TARIFS FOURNISSEURS (Prix par fournisseur)
-- =====================================================
CREATE TABLE tarifs_fournisseurs (
    id_tarif SERIAL PRIMARY KEY,
    id_produit INT NOT NULL REFERENCES produits(id_produit) ON DELETE CASCADE,
    id_fournisseur INT NOT NULL REFERENCES partenaires(id_partenaire) ON DELETE CASCADE,
    reference_fournisseur VARCHAR(100),
    prix_achat NUMERIC(15,4) NOT NULL,
    devise VARCHAR(3) DEFAULT 'MAD',
    date_tarif DATE DEFAULT CURRENT_DATE,
    quantite_min INT DEFAULT 1,
    delai_livraison_jours INT,
    est_fournisseur_principal BOOLEAN DEFAULT FALSE,
    est_actif BOOLEAN DEFAULT TRUE,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_produit, id_fournisseur)
);

CREATE INDEX idx_tarifs_produit ON tarifs_fournisseurs(id_produit);
CREATE INDEX idx_tarifs_fournisseur ON tarifs_fournisseurs(id_fournisseur);

-- =====================================================
-- 6. NIVEAUX STOCK (Stock par dépôt)
-- =====================================================
CREATE TABLE niveaux_stock (
    id_stock SERIAL PRIMARY KEY,
    id_produit INT NOT NULL REFERENCES produits(id_produit) ON DELETE CASCADE,
    id_entrepot INT NOT NULL REFERENCES entrepots(id_entrepot) ON DELETE CASCADE,
    quantite_en_stock NUMERIC(15,3) DEFAULT 0,     -- Stock réel
    quantite_reservee NUMERIC(15,3) DEFAULT 0,     -- Réservé pour commandes
    quantite_commandee NUMERIC(15,3) DEFAULT 0,    -- En attente de réception
    date_dernier_mouvement TIMESTAMP,
    type_dernier_mouvement VARCHAR(50),
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_produit, id_entrepot)
);

-- Stock disponible à la vente = en_stock - réservé
CREATE INDEX idx_stock_produit ON niveaux_stock(id_produit);
CREATE INDEX idx_stock_entrepot ON niveaux_stock(id_entrepot);

-- =====================================================
-- 7. AFFAIRES (Projets / Codes Affaires)
-- =====================================================
CREATE TABLE affaires (
    id_affaire SERIAL PRIMARY KEY,
    code_affaire VARCHAR(50) UNIQUE NOT NULL,
    intitule_affaire VARCHAR(500) NOT NULL,
    type_affaire VARCHAR(30) DEFAULT 'Proposition' CHECK (type_affaire IN ('Proposition', 'Accepté', 'Perdu', 'En cours', 'En attente', 'Terminé')),
    statut_affaire VARCHAR(30) DEFAULT 'En cours',
    abrege VARCHAR(100),
    id_client INT REFERENCES partenaires(id_partenaire),
    date_debut DATE,
    date_fin_prevue DATE,
    date_fin_reelle DATE,
    budget_prevu NUMERIC(15,2),
    chiffre_affaires NUMERIC(15,2) DEFAULT 0,
    marge NUMERIC(15,2) DEFAULT 0,
    taux_remise_moyen NUMERIC(5,2) DEFAULT 0,
    notes TEXT,
    est_actif BOOLEAN DEFAULT TRUE,
    en_sommeil BOOLEAN DEFAULT FALSE,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cree_par UUID,
    modifie_par UUID
);

CREATE INDEX idx_affaires_type ON affaires(type_affaire);
CREATE INDEX idx_affaires_client ON affaires(id_client);
CREATE INDEX idx_affaires_actif ON affaires(est_actif);

-- =====================================================
-- 8. DOCUMENTS (Ventes & Achats)
-- =====================================================
CREATE TABLE documents (
    id_document SERIAL PRIMARY KEY,
    numero_document VARCHAR(50) UNIQUE NOT NULL,
    type_document VARCHAR(30) NOT NULL CHECK (type_document IN (
        -- Ventes
        'DEVIS', 'BON_COMMANDE', 'PREPARATION_LIVRAISON', 'BON_LIVRAISON', 
        'BON_RETOUR', 'BON_AVOIR_FINANCIER', 'FACTURE', 'FACTURE_COMPTABILISEE',
        -- Achats
        'DEMANDE_ACHAT', 'PREPARATION_COMMANDE', 'COMMANDE_ACHAT', 
        'BON_RECEPTION', 'FACTURE_ACHAT'
    )),
    domaine_document VARCHAR(10) DEFAULT 'VENTE' CHECK (domaine_document IN ('VENTE', 'ACHAT')),
    etat_document VARCHAR(30) DEFAULT 'Saisi' CHECK (etat_document IN ('Saisi', 'A comptabiliser', 'Confirmé')),
    id_partenaire INT NOT NULL REFERENCES partenaires(id_partenaire),
    nom_partenaire_snapshot VARCHAR(255),  -- Snapshot at creation
    id_affaire INT REFERENCES affaires(id_affaire),
    numero_affaire VARCHAR(50),  -- For quick reference
    date_document DATE NOT NULL DEFAULT CURRENT_DATE,
    date_echeance DATE,
    date_livraison DATE,
    date_livraison_prevue DATE,
    -- Montants
    montant_ht NUMERIC(15,2) DEFAULT 0,
    montant_remise_total NUMERIC(15,2) DEFAULT 0,
    montant_tva_total NUMERIC(15,2) DEFAULT 0,
    montant_ttc NUMERIC(15,2) DEFAULT 0,
    solde_du NUMERIC(15,2) DEFAULT 0,  -- Pour documents achats
    -- Devise
    code_devise VARCHAR(3) DEFAULT 'MAD',
    taux_change NUMERIC(10,6) DEFAULT 1,
    -- Statut
    statut_document VARCHAR(20) DEFAULT 'BROUILLON' CHECK (statut_document IN (
        'BROUILLON', 'CONFIRME', 'EXPEDITION', 'LIVRE', 'FACTURE', 'ANNULE', 'POSTE'
    )),
    est_entierement_paye BOOLEAN DEFAULT FALSE,
    -- Entrepôt
    id_entrepot INT REFERENCES entrepots(id_entrepot),
    -- Notes
    notes_internes TEXT,
    notes_client TEXT,
    reference_externe VARCHAR(100),  -- N° commande client
    -- Audit
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cree_par UUID,
    modifie_par UUID
);

CREATE INDEX idx_documents_type ON documents(type_document);
CREATE INDEX idx_documents_domaine ON documents(domaine_document);
CREATE INDEX idx_documents_partenaire ON documents(id_partenaire);
CREATE INDEX idx_documents_affaire ON documents(id_affaire);
CREATE INDEX idx_documents_date ON documents(date_document);
CREATE INDEX idx_documents_statut ON documents(statut_document);

-- =====================================================
-- 9. LIGNES DOCUMENTS
-- =====================================================
CREATE TABLE lignes_documents (
    id_ligne SERIAL PRIMARY KEY,
    id_document INT NOT NULL REFERENCES documents(id_document) ON DELETE CASCADE,
    numero_ligne INT NOT NULL,
    id_affaire INT REFERENCES affaires(id_affaire),
    numero_affaire VARCHAR(50),
    id_produit INT NOT NULL REFERENCES produits(id_produit),
    code_produit_snapshot VARCHAR(100),
    nom_produit_snapshot VARCHAR(500),
    -- Quantités
    quantite_commandee NUMERIC(15,3) DEFAULT 0,
    quantite_livree NUMERIC(15,3) DEFAULT 0,
    quantite_facturee NUMERIC(15,3) DEFAULT 0,
    -- Prix
    prix_unitaire_ht NUMERIC(15,4) NOT NULL,
    pourcentage_remise NUMERIC(5,2) DEFAULT 0,
    taux_tva NUMERIC(5,2) DEFAULT 20.00,
    -- Montants calculés
    montant_remise NUMERIC(15,2) DEFAULT 0,
    montant_ht NUMERIC(15,2) DEFAULT 0,
    montant_tva NUMERIC(15,2) DEFAULT 0,
    montant_ttc NUMERIC(15,2) DEFAULT 0,
    -- Statut
    statut_ligne VARCHAR(20) DEFAULT 'EN_ATTENTE' CHECK (statut_ligne IN ('EN_ATTENTE', 'PARTIELLE', 'COMPLETE', 'ANNULEE')),
    notes_ligne TEXT,
    -- Audit
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lignes_document ON lignes_documents(id_document);
CREATE INDEX idx_lignes_produit ON lignes_documents(id_produit);
CREATE INDEX idx_lignes_affaire ON lignes_documents(id_affaire);

-- =====================================================
-- 10. HISTORIQUE PRIX ACHATS
-- =====================================================
CREATE TABLE historique_prix_achats (
    id_historique SERIAL PRIMARY KEY,
    id_produit INT NOT NULL REFERENCES produits(id_produit) ON DELETE CASCADE,
    id_fournisseur INT REFERENCES partenaires(id_partenaire),
    id_document INT REFERENCES documents(id_document),
    prix_achat NUMERIC(15,4) NOT NULL,
    quantite NUMERIC(15,3),
    date_achat DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_historique_produit ON historique_prix_achats(id_produit);
CREATE INDEX idx_historique_date ON historique_prix_achats(date_achat);

-- =====================================================
-- 11. MOUVEMENTS STOCK
-- =====================================================
CREATE TABLE mouvements_stock (
    id_mouvement SERIAL PRIMARY KEY,
    id_produit INT NOT NULL REFERENCES produits(id_produit),
    id_entrepot INT NOT NULL REFERENCES entrepots(id_entrepot),
    id_document INT REFERENCES documents(id_document),
    id_ligne_document INT REFERENCES lignes_documents(id_ligne),
    type_mouvement VARCHAR(30) NOT NULL CHECK (type_mouvement IN (
        'ENTREE', 'SORTIE', 'TRANSFERT', 'AJUSTEMENT', 'INVENTAIRE'
    )),
    quantite NUMERIC(15,3) NOT NULL,  -- Positive for in, negative for out
    date_mouvement TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reference_document VARCHAR(50),
    motif TEXT,
    cree_par UUID,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mouvements_produit ON mouvements_stock(id_produit);
CREATE INDEX idx_mouvements_entrepot ON mouvements_stock(id_entrepot);
CREATE INDEX idx_mouvements_date ON mouvements_stock(date_mouvement);

-- =====================================================
-- VIEWS
-- =====================================================

-- Vue Articles avec stock, prix et fournisseur
CREATE OR REPLACE VIEW vue_articles_complet AS
SELECT 
    p.id_produit,
    p.code_produit AS reference_article,
    p.nom_produit AS designation,
    c.nom_categorie AS famille,
    p.famille AS sous_famille,
    p.unite_mesure AS unite,
    COALESCE(SUM(ns.quantite_en_stock), 0) AS stock_reel,
    p.prix_achat,
    p.prix_dernier_achat,
    p.coefficient,
    p.prix_vente,
    p.taux_tva,
    f.nom_partenaire AS fournisseur_principal,
    p.reference_fournisseur,
    p.est_actif,
    p.en_sommeil
FROM produits p
LEFT JOIN categories_produits c ON p.id_categorie = c.id_categorie
LEFT JOIN niveaux_stock ns ON p.id_produit = ns.id_produit
LEFT JOIN partenaires f ON p.id_fournisseur_principal = f.id_partenaire
GROUP BY p.id_produit, c.nom_categorie, f.nom_partenaire;

-- Vue Stock par dépôt
CREATE OR REPLACE VIEW vue_stock_depot AS
SELECT 
    p.id_produit,
    p.code_produit AS reference_article,
    p.nom_produit AS designation,
    c.nom_categorie AS famille,
    e.code_entrepot,
    e.nom_entrepot AS depot,
    ns.quantite_en_stock AS stock_reel,
    ns.quantite_reservee,
    ns.quantite_commandee,
    (ns.quantite_en_stock - ns.quantite_reservee) AS stock_disponible,
    p.prix_achat * ns.quantite_en_stock AS valeur_stock
FROM produits p
JOIN niveaux_stock ns ON p.id_produit = ns.id_produit
JOIN entrepots e ON ns.id_entrepot = e.id_entrepot
LEFT JOIN categories_produits c ON p.id_categorie = c.id_categorie
WHERE p.est_actif = TRUE;

-- Vue Interrogation Commerciale par Affaire
CREATE OR REPLACE VIEW vue_interrogation_commerciale AS
SELECT 
    a.id_affaire,
    a.code_affaire,
    a.intitule_affaire,
    a.type_affaire,
    d.numero_document,
    d.date_document,
    p_client.nom_partenaire AS client,
    ld.quantite_livree AS quantite,
    prod.nom_produit AS designation,
    ld.prix_unitaire_ht AS pu_ht,
    ld.montant_ttc AS pu_ttc,
    ld.montant_ht
FROM affaires a
LEFT JOIN documents d ON d.id_affaire = a.id_affaire
LEFT JOIN partenaires p_client ON d.id_partenaire = p_client.id_partenaire
LEFT JOIN lignes_documents ld ON d.id_document = ld.id_document
LEFT JOIN produits prod ON ld.id_produit = prod.id_produit;

-- Vue Stats Affaires
CREATE OR REPLACE VIEW vue_stats_affaires AS
SELECT 
    a.id_affaire,
    a.code_affaire,
    a.intitule_affaire,
    a.type_affaire,
    COALESCE(SUM(ld.montant_ht), 0) AS chiffre_affaires,
    COALESCE(SUM(ld.montant_ht - (ld.quantite_livree * prod.prix_achat)), 0) AS marge,
    AVG(ld.pourcentage_remise) AS taux_remise_moyen
FROM affaires a
LEFT JOIN documents d ON d.id_affaire = a.id_affaire AND d.type_document = 'FACTURE'
LEFT JOIN lignes_documents ld ON d.id_document = ld.id_document
LEFT JOIN produits prod ON ld.id_produit = prod.id_produit
GROUP BY a.id_affaire;

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Auto-update date_modification
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.date_modification = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables
CREATE TRIGGER update_partenaires_modtime BEFORE UPDATE ON partenaires FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_produits_modtime BEFORE UPDATE ON produits FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_categories_modtime BEFORE UPDATE ON categories_produits FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_entrepots_modtime BEFORE UPDATE ON entrepots FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_affaires_modtime BEFORE UPDATE ON affaires FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_documents_modtime BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_niveaux_stock_modtime BEFORE UPDATE ON niveaux_stock FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_tarifs_modtime BEFORE UPDATE ON tarifs_fournisseurs FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE partenaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE produits ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories_produits ENABLE ROW LEVEL SECURITY;
ALTER TABLE entrepots ENABLE ROW LEVEL SECURITY;
ALTER TABLE affaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE lignes_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE niveaux_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarifs_fournisseurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE historique_prix_achats ENABLE ROW LEVEL SECURITY;
ALTER TABLE mouvements_stock ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (adjust as needed)
CREATE POLICY "Allow all for authenticated" ON partenaires FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON produits FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON categories_produits FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON entrepots FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON affaires FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON lignes_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON niveaux_stock FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON tarifs_fournisseurs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON historique_prix_achats FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON mouvements_stock FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Also allow anon for development (remove in production)
CREATE POLICY "Allow all for anon" ON partenaires FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON produits FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON categories_produits FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON entrepots FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON affaires FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON documents FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON lignes_documents FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON niveaux_stock FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON tarifs_fournisseurs FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON historique_prix_achats FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON mouvements_stock FOR ALL TO anon USING (true) WITH CHECK (true);

-- =====================================================
-- SAMPLE DATA
-- =====================================================

-- Entrepôts
INSERT INTO entrepots (code_entrepot, nom_entrepot, ville_entrepot, est_entrepot_principal) VALUES
('DEP01', 'Dépôt Principal', 'Casablanca', TRUE),
('DEP02', 'Dépôt Secondaire', 'Marrakech', FALSE),
('DEP03', 'Dépôt Tanger', 'Tanger', FALSE);

-- Catégories (Familles)
INSERT INTO categories_produits (code_categorie, nom_categorie) VALUES
('ELEC', 'Cable électrique et chemin de cable'),
('DATA', 'Data & Telecom'),
('ECL', 'Eclairage'),
('OUT', 'Outillage'),
('PLOMB', 'PLOMBERIE'),
('PEINT', 'Peinture'),
('PROT', 'Protection-distribution-Appareillage'),
('CLIM', 'climatisation-chauffage'),
('ENERG', 'sources-denergie'),
('VISS', 'visserie-et-fixation');

-- Partenaires
INSERT INTO partenaires (code_partenaire, nom_partenaire, type_partenaire, ville) VALUES
('CLI001', 'LA NOUVELLE SOCIETE AVANT SCENE', 'CLIENT', 'Casablanca'),
('CLI002', 'ECLANOUR', 'CLIENT', 'Rabat'),
('CLI003', 'SOCIETE D''INGENIERIE ENERGETIQUE', 'CLIENT', 'Casablanca'),
('CLI004', 'TANGER AL OMRANE', 'CLIENT', 'Tanger'),
('CLI005', 'Commune de Temara', 'CLIENT', 'Temara'),
('CLI006', 'RAM HANDLING', 'CLIENT', 'Casablanca'),
('CLI007', 'VOLTRAV', 'CLIENT', 'Casablanca'),
('FRN001', 'CHIBA INDUSTRIE', 'FOURNISSEUR', 'Casablanca'),
('FRN002', 'GENERAL TECHNICS', 'FOURNISSEUR', 'Casablanca'),
('FRN003', 'SOFA', 'FOURNISSEUR', 'Casablanca'),
('FRN004', 'KF MAR', 'FOURNISSEUR', 'Casablanca'),
('FRN005', 'CITMETAL', 'FOURNISSEUR', 'Casablanca'),
('FRN006', 'ELECBEN', 'FOURNISSEUR', 'Casablanca'),
('FRN007', 'GENERAL LIGHTING', 'FOURNISSEUR', 'Casablanca');

-- Produits
INSERT INTO produits (code_produit, nom_produit, id_categorie, famille, unite_mesure, prix_achat, coefficient, prix_vente) VALUES
('25-378', 'VINYLASTRAL BLANC 30K', 1, 'PNTVNL', 'U', 474.0000, 1.0, 0),
('25-708', 'VIGI IC60 2P 25A 30MA AC A9V41225', 3, 'VIGI', 'U', 480.0000, 1.0, 0),
('25-707', 'VIGI IC40 1P+N 25A 30MA AC A9Y82625', 3, 'VIGI', 'U', 440.0000, 1.0, 0),
('25-697', 'VIGI 4P 40A 300MA A9V44440', 3, 'VIGI', 'U', 860.0000, 1.0, 0),
('25-170', 'VIGI 40A 4P 30MA', 3, 'VIGI', 'U', NULL, 1.0, 0),
('25-169', 'VIGI 40A 2P 30MA', 3, 'VIGI', 'U', NULL, 1.0, 0),
('25-701', 'VIGI 2P 25A 300MA AC A9V44425', 3, 'VIGI', 'U', 510.0000, 1.0, 0),
('VERN5L', 'VERNES 5L', 8, 'NNN', 'U', NULL, 1.0, 0),
('25-751', 'VENTOUSE AUTO REGLABLE DIAM 100', 8, 'NNN', 'U', 130.0000, 1.0, 0),
('25-792', 'VENTILATEUR DE GAINE TOL NANYOO SIAM 100', 8, 'NNN', 'U', NULL, 1.0, 0),
('25-448', 'VENTILATEUR DE GAINE SYSTEMAIR DIM 200', 8, 'NNN', 'U', NULL, 1.0, 0),
('25-447', 'VENTILATEUR DE GAINE SYSTEMAIR DIM 100', 8, 'NNN', 'U', NULL, 1.0, 0),
('25-570', 'VANNE PPR 63', 5, 'VNNPPR', 'U', NULL, 1.0, 0),
('25-571', 'VANNE PPR 50', 5, 'VNNPPR', 'U', 394.2000, 1.0, 0),
('25-572', 'VANNE PPR 40', 5, 'VNNPPR', 'U', 288.1500, 1.0, 0),
('25-569', 'VANNE PPR 32', 5, 'VNNPPR', 'U', NULL, 1.0, 0);

-- Niveaux Stock
INSERT INTO niveaux_stock (id_produit, id_entrepot, quantite_en_stock) VALUES
(1, 1, 0),
(2, 1, 10),
(3, 1, 3),
(4, 1, 1),
(5, 1, 0),
(6, 1, 0),
(7, 1, 2),
(8, 1, 0),
(9, 1, 0),
(10, 1, 0);

-- Affaires (Projets)
INSERT INTO affaires (code_affaire, intitule_affaire, type_affaire, id_client) VALUES
('092024', 'T-poteaux et cablage public temara', 'En cours', 5),
('042024', 'T-instl poteaux et cablage ain aoud', 'En cours', 5),
('19TTHTA2025', 'T-NouiNouich subdivision in Tangier', 'En cours', 4),
('SIE032023', 'SIE032023', 'Terminé', 3),
('66BKAM2024', 'REMPL GRP ELECT BAM MARRAKECH', 'En cours', 3),
('M41TAN22', 'M41TAN22', 'Terminé', 4),
('RAM232023', 'RAM232023', 'Proposition', 6),
('BC251757', 'AVANT SCENE', 'Proposition', 1);

-- Documents
INSERT INTO documents (numero_document, type_document, domaine_document, etat_document, id_partenaire, id_affaire, date_document, montant_ht, montant_ttc) VALUES
('FA240019', 'FACTURE', 'VENTE', 'A comptabiliser', 2, NULL, '2024-02-16', 1415.95, 1699.14),
('FA240020', 'FACTURE', 'VENTE', 'A comptabiliser', 3, NULL, '2024-02-04', 0, 0),
('FA240032', 'FACTURE', 'VENTE', 'Saisi', 3, 4, '2024-05-03', 0, 0),
('FA240082', 'FACTURE', 'VENTE', 'Saisi', 4, 6, '2024-05-13', 0, 0),
('FA240084', 'FACTURE', 'VENTE', 'Saisi', 3, 4, '2024-05-18', 0, 0),
('FA240098', 'FACTURE', 'VENTE', 'A comptabiliser', 5, NULL, '2024-07-19', 1021056.64, 1225267.96);


-- =====================================================
-- 12. ENHANCEMENTS (Traceability, Pricing, Accounting)
-- =====================================================

-- 12.1. TRACEABILITY
CREATE TABLE IF NOT EXISTS lots_serie (
    id_lot SERIAL PRIMARY KEY,
    code_lot VARCHAR(50) NOT NULL,
    id_produit INT NOT NULL REFERENCES produits(id_produit) ON DELETE CASCADE,
    date_fabrication DATE,
    date_peremption DATE,
    numero_serie_unique VARCHAR(100),
    quantite_initiale NUMERIC(15,3),
    quantite_actuelle NUMERIC(15,3) DEFAULT 0,
    est_actif BOOLEAN DEFAULT TRUE,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(code_lot, id_produit)
);

ALTER TABLE produits ADD COLUMN IF NOT EXISTS type_suivi_stock VARCHAR(20) DEFAULT 'AUCUN' CHECK (type_suivi_stock IN ('AUCUN', 'SERIALISE', 'LOT'));
ALTER TABLE lignes_documents ADD COLUMN IF NOT EXISTS id_lot INT REFERENCES lots_serie(id_lot);
ALTER TABLE mouvements_stock ADD COLUMN IF NOT EXISTS id_lot INT REFERENCES lots_serie(id_lot);

-- 12.2. ADVANCED PRICING
CREATE TABLE IF NOT EXISTS tarifs_exceptionnels (
    id_tarif_ex SERIAL PRIMARY KEY,
    id_produit INT REFERENCES produits(id_produit) ON DELETE CASCADE,
    id_client INT REFERENCES partenaires(id_partenaire) ON DELETE CASCADE,
    quantite_min INT DEFAULT 1,
    prix_vente_fixe NUMERIC(15,4),
    remise_pourcentage NUMERIC(5,2),
    date_debut DATE,
    date_fin DATE,
    priorite INT DEFAULT 0,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12.3. ACCOUNTING
ALTER TABLE partenaires ADD COLUMN IF NOT EXISTS compte_collectif VARCHAR(20);
ALTER TABLE partenaires ADD COLUMN IF NOT EXISTS compte_auxiliaire VARCHAR(20);

ALTER TABLE produits ADD COLUMN IF NOT EXISTS compte_general_vente VARCHAR(20);
ALTER TABLE produits ADD COLUMN IF NOT EXISTS compte_general_achat VARCHAR(20);
ALTER TABLE produits ADD COLUMN IF NOT EXISTS code_taxe_vente VARCHAR(10);
ALTER TABLE produits ADD COLUMN IF NOT EXISTS code_taxe_achat VARCHAR(10);

-- 12.4. LOGISTICS
ALTER TABLE documents ADD COLUMN IF NOT EXISTS mode_expedition VARCHAR(50);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS poids_total_brut NUMERIC(10,3);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS nombre_colis INT;

-- RLS
ALTER TABLE lots_serie ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarifs_exceptionnels ENABLE ROW LEVEL SECURITY;
-- Note: Policies must be applied manually or included here if re-running

