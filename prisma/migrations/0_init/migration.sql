-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'HR', 'USER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'HR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partenaires" (
    "id_partenaire" SERIAL NOT NULL,
    "code_partenaire" VARCHAR(50) NOT NULL,
    "nom_partenaire" VARCHAR(255) NOT NULL,
    "type_partenaire" VARCHAR(20) NOT NULL,
    "adresse_email" VARCHAR(255),
    "numero_telephone" VARCHAR(50),
    "numero_fax" VARCHAR(50),
    "url_site_web" VARCHAR(255),
    "adresse_rue" TEXT,
    "code_postal" VARCHAR(20),
    "ville" VARCHAR(100),
    "pays" VARCHAR(100) DEFAULT 'Maroc',
    "numero_tva" VARCHAR(50),
    "numero_ice" VARCHAR(50),
    "numero_rc" VARCHAR(50),
    "delai_paiement_jours" INTEGER DEFAULT 30,
    "limite_credit" DECIMAL(15,2),
    "pourcentage_remise" DECIMAL(5,2) DEFAULT 0,
    "numero_compte_bancaire" VARCHAR(50),
    "code_banque" VARCHAR(20),
    "numero_iban" VARCHAR(50),
    "code_swift" VARCHAR(20),
    "est_actif" BOOLEAN NOT NULL DEFAULT true,
    "est_bloque" BOOLEAN NOT NULL DEFAULT false,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_modification" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cree_par" UUID,
    "modifie_par" UUID,
    "compte_collectif" VARCHAR(20),
    "compte_auxiliaire" VARCHAR(20),

    CONSTRAINT "partenaires_pkey" PRIMARY KEY ("id_partenaire")
);

-- CreateTable
CREATE TABLE "categories_produits" (
    "id_categorie" SERIAL NOT NULL,
    "code_categorie" VARCHAR(50) NOT NULL,
    "nom_categorie" VARCHAR(255) NOT NULL,
    "id_categorie_parent" INTEGER,
    "description_categorie" TEXT,
    "est_actif" BOOLEAN NOT NULL DEFAULT true,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_modification" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_produits_pkey" PRIMARY KEY ("id_categorie")
);

-- CreateTable
CREATE TABLE "entrepots" (
    "id_entrepot" SERIAL NOT NULL,
    "code_entrepot" VARCHAR(50) NOT NULL,
    "nom_entrepot" VARCHAR(255) NOT NULL,
    "adresse_entrepot" TEXT,
    "ville_entrepot" VARCHAR(100),
    "code_postal_entrepot" VARCHAR(20),
    "capacite_totale_unites" INTEGER,
    "nom_responsable" VARCHAR(255),
    "email_responsable" VARCHAR(255),
    "telephone_responsable" VARCHAR(50),
    "est_actif" BOOLEAN NOT NULL DEFAULT true,
    "est_entrepot_principal" BOOLEAN NOT NULL DEFAULT false,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_modification" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entrepots_pkey" PRIMARY KEY ("id_entrepot")
);

-- CreateTable
CREATE TABLE "produits" (
    "id_produit" SERIAL NOT NULL,
    "code_produit" VARCHAR(100) NOT NULL,
    "nom_produit" VARCHAR(500) NOT NULL,
    "id_categorie" INTEGER,
    "famille" VARCHAR(100),
    "description_produit" TEXT,
    "code_barre_ean" VARCHAR(50),
    "unite_mesure" VARCHAR(20) NOT NULL DEFAULT 'U',
    "poids_kg" DECIMAL(10,3),
    "volume_m3" DECIMAL(10,6),
    "prix_achat" DECIMAL(15,4),
    "prix_dernier_achat" DECIMAL(15,4),
    "coefficient" DECIMAL(8,4) DEFAULT 1.0,
    "prix_vente" DECIMAL(15,4),
    "prix_gros" DECIMAL(15,4),
    "taux_tva" DECIMAL(5,2) DEFAULT 20.00,
    "type_suivi_stock" VARCHAR(20) DEFAULT 'AUCUN',
    "quantite_min_commande" INTEGER DEFAULT 1,
    "niveau_reappro_quantite" INTEGER DEFAULT 0,
    "stock_minimum" INTEGER DEFAULT 0,
    "stock_maximum" INTEGER,
    "activer_suivi_stock" BOOLEAN NOT NULL DEFAULT true,
    "id_fournisseur_principal" INTEGER,
    "reference_fournisseur" VARCHAR(100),
    "delai_livraison_fournisseur_jours" INTEGER,
    "est_actif" BOOLEAN NOT NULL DEFAULT true,
    "en_sommeil" BOOLEAN NOT NULL DEFAULT false,
    "est_abandonne" BOOLEAN NOT NULL DEFAULT false,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_modification" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cree_par" UUID,
    "modifie_par" UUID,
    "compte_general_vente" VARCHAR(20),
    "compte_general_achat" VARCHAR(20),
    "code_taxe_vente" VARCHAR(10),
    "code_taxe_achat" VARCHAR(10),

    CONSTRAINT "produits_pkey" PRIMARY KEY ("id_produit")
);

-- CreateTable
CREATE TABLE "tarifs_fournisseurs" (
    "id_tarif" SERIAL NOT NULL,
    "id_produit" INTEGER NOT NULL,
    "id_fournisseur" INTEGER NOT NULL,
    "reference_fournisseur" VARCHAR(100),
    "prix_achat" DECIMAL(15,4) NOT NULL,
    "devise" VARCHAR(3) NOT NULL DEFAULT 'MAD',
    "date_tarif" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quantite_min" INTEGER DEFAULT 1,
    "delai_livraison_jours" INTEGER,
    "est_fournisseur_principal" BOOLEAN NOT NULL DEFAULT false,
    "est_actif" BOOLEAN NOT NULL DEFAULT true,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_modification" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tarifs_fournisseurs_pkey" PRIMARY KEY ("id_tarif")
);

-- CreateTable
CREATE TABLE "niveaux_stock" (
    "id_stock" SERIAL NOT NULL,
    "id_produit" INTEGER NOT NULL,
    "id_entrepot" INTEGER NOT NULL,
    "quantite_en_stock" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "quantite_reservee" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "quantite_commandee" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "date_dernier_mouvement" TIMESTAMP(3),
    "type_dernier_mouvement" VARCHAR(50),
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_modification" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "niveaux_stock_pkey" PRIMARY KEY ("id_stock")
);

-- CreateTable
CREATE TABLE "affaires" (
    "id_affaire" SERIAL NOT NULL,
    "code_affaire" VARCHAR(50) NOT NULL,
    "intitule_affaire" VARCHAR(500) NOT NULL,
    "type_affaire" VARCHAR(30) NOT NULL DEFAULT 'Proposition',
    "statut_affaire" VARCHAR(30) DEFAULT 'En cours',
    "abrege" VARCHAR(100),
    "id_client" INTEGER,
    "date_debut" DATE,
    "date_fin_prevue" DATE,
    "date_fin_reelle" DATE,
    "budget_prevu" DECIMAL(15,2),
    "chiffre_affaires" DECIMAL(15,2) DEFAULT 0,
    "marge" DECIMAL(15,2) DEFAULT 0,
    "taux_remise_moyen" DECIMAL(5,2) DEFAULT 0,
    "notes" TEXT,
    "est_actif" BOOLEAN NOT NULL DEFAULT true,
    "en_sommeil" BOOLEAN NOT NULL DEFAULT false,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_modification" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cree_par" UUID,
    "modifie_par" UUID,

    CONSTRAINT "affaires_pkey" PRIMARY KEY ("id_affaire")
);

-- CreateTable
CREATE TABLE "documents" (
    "id_document" SERIAL NOT NULL,
    "numero_document" VARCHAR(50) NOT NULL,
    "type_document" VARCHAR(30) NOT NULL,
    "domaine_document" VARCHAR(10) NOT NULL DEFAULT 'VENTE',
    "etat_document" VARCHAR(30) NOT NULL DEFAULT 'Saisi',
    "id_partenaire" INTEGER NOT NULL,
    "nom_partenaire_snapshot" VARCHAR(255),
    "id_affaire" INTEGER,
    "numero_affaire" VARCHAR(50),
    "date_document" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_echeance" DATE,
    "date_livraison" DATE,
    "date_livraison_prevue" DATE,
    "montant_ht" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "montant_remise_total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "montant_tva_total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "montant_ttc" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "solde_du" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "code_devise" VARCHAR(3) NOT NULL DEFAULT 'MAD',
    "taux_change" DECIMAL(10,6) NOT NULL DEFAULT 1,
    "statut_document" VARCHAR(20) NOT NULL DEFAULT 'BROUILLON',
    "est_entierement_paye" BOOLEAN NOT NULL DEFAULT false,
    "id_entrepot" INTEGER,
    "notes_internes" TEXT,
    "notes_client" TEXT,
    "reference_externe" VARCHAR(100),
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_modification" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cree_par" UUID,
    "modifie_par" UUID,
    "mode_expedition" VARCHAR(50),
    "poids_total_brut" DECIMAL(10,3),
    "nombre_colis" INTEGER,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id_document")
);

-- CreateTable
CREATE TABLE "lignes_documents" (
    "id_ligne" SERIAL NOT NULL,
    "id_document" INTEGER NOT NULL,
    "numero_ligne" INTEGER NOT NULL,
    "id_affaire" INTEGER,
    "numero_affaire" VARCHAR(50),
    "id_produit" INTEGER NOT NULL,
    "code_produit_snapshot" VARCHAR(100),
    "nom_produit_snapshot" VARCHAR(500),
    "quantite_commandee" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "quantite_livree" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "quantite_facturee" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "prix_unitaire_ht" DECIMAL(15,4) NOT NULL,
    "pourcentage_remise" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taux_tva" DECIMAL(5,2) NOT NULL DEFAULT 20.00,
    "montant_remise" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "montant_ht" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "montant_tva" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "montant_ttc" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "statut_ligne" VARCHAR(20) NOT NULL DEFAULT 'EN_ATTENTE',
    "notes_ligne" TEXT,
    "id_lot" INTEGER,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_modification" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lignes_documents_pkey" PRIMARY KEY ("id_ligne")
);

-- CreateTable
CREATE TABLE "historique_prix_achats" (
    "id_historique" SERIAL NOT NULL,
    "id_produit" INTEGER NOT NULL,
    "id_fournisseur" INTEGER,
    "id_document" INTEGER,
    "prix_achat" DECIMAL(15,4) NOT NULL,
    "quantite" DECIMAL(15,3),
    "date_achat" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historique_prix_achats_pkey" PRIMARY KEY ("id_historique")
);

-- CreateTable
CREATE TABLE "mouvements_stock" (
    "id_mouvement" SERIAL NOT NULL,
    "id_produit" INTEGER NOT NULL,
    "id_entrepot" INTEGER NOT NULL,
    "id_document" INTEGER,
    "id_ligne_document" INTEGER,
    "type_mouvement" VARCHAR(30) NOT NULL,
    "quantite" DECIMAL(15,3) NOT NULL,
    "date_mouvement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference_document" VARCHAR(50),
    "motif" TEXT,
    "cree_par" UUID,
    "id_lot" INTEGER,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mouvements_stock_pkey" PRIMARY KEY ("id_mouvement")
);

-- CreateTable
CREATE TABLE "lots_serie" (
    "id_lot" SERIAL NOT NULL,
    "code_lot" VARCHAR(50) NOT NULL,
    "id_produit" INTEGER NOT NULL,
    "date_fabrication" DATE,
    "date_peremption" DATE,
    "numero_serie_unique" VARCHAR(100),
    "quantite_initiale" DECIMAL(15,3),
    "quantite_actuelle" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "est_actif" BOOLEAN NOT NULL DEFAULT true,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lots_serie_pkey" PRIMARY KEY ("id_lot")
);

-- CreateTable
CREATE TABLE "tarifs_exceptionnels" (
    "id_tarif_ex" SERIAL NOT NULL,
    "id_produit" INTEGER,
    "id_client" INTEGER,
    "quantite_min" INTEGER DEFAULT 1,
    "prix_vente_fixe" DECIMAL(15,4),
    "remise_pourcentage" DECIMAL(5,2),
    "date_debut" DATE,
    "date_fin" DATE,
    "priorite" INTEGER DEFAULT 0,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tarifs_exceptionnels_pkey" PRIMARY KEY ("id_tarif_ex")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "partenaires_code_partenaire_key" ON "partenaires"("code_partenaire");

-- CreateIndex
CREATE INDEX "partenaires_type_partenaire_idx" ON "partenaires"("type_partenaire");

-- CreateIndex
CREATE INDEX "partenaires_est_actif_idx" ON "partenaires"("est_actif");

-- CreateIndex
CREATE UNIQUE INDEX "categories_produits_code_categorie_key" ON "categories_produits"("code_categorie");

-- CreateIndex
CREATE INDEX "categories_produits_id_categorie_parent_idx" ON "categories_produits"("id_categorie_parent");

-- CreateIndex
CREATE UNIQUE INDEX "entrepots_code_entrepot_key" ON "entrepots"("code_entrepot");

-- CreateIndex
CREATE UNIQUE INDEX "produits_code_produit_key" ON "produits"("code_produit");

-- CreateIndex
CREATE INDEX "produits_id_categorie_idx" ON "produits"("id_categorie");

-- CreateIndex
CREATE INDEX "produits_famille_idx" ON "produits"("famille");

-- CreateIndex
CREATE INDEX "produits_id_fournisseur_principal_idx" ON "produits"("id_fournisseur_principal");

-- CreateIndex
CREATE INDEX "produits_est_actif_idx" ON "produits"("est_actif");

-- CreateIndex
CREATE INDEX "produits_code_produit_idx" ON "produits"("code_produit");

-- CreateIndex
CREATE INDEX "tarifs_fournisseurs_id_produit_idx" ON "tarifs_fournisseurs"("id_produit");

-- CreateIndex
CREATE INDEX "tarifs_fournisseurs_id_fournisseur_idx" ON "tarifs_fournisseurs"("id_fournisseur");

-- CreateIndex
CREATE UNIQUE INDEX "tarifs_fournisseurs_id_produit_id_fournisseur_key" ON "tarifs_fournisseurs"("id_produit", "id_fournisseur");

-- CreateIndex
CREATE INDEX "niveaux_stock_id_produit_idx" ON "niveaux_stock"("id_produit");

-- CreateIndex
CREATE INDEX "niveaux_stock_id_entrepot_idx" ON "niveaux_stock"("id_entrepot");

-- CreateIndex
CREATE UNIQUE INDEX "niveaux_stock_id_produit_id_entrepot_key" ON "niveaux_stock"("id_produit", "id_entrepot");

-- CreateIndex
CREATE UNIQUE INDEX "affaires_code_affaire_key" ON "affaires"("code_affaire");

-- CreateIndex
CREATE INDEX "affaires_type_affaire_idx" ON "affaires"("type_affaire");

-- CreateIndex
CREATE INDEX "affaires_id_client_idx" ON "affaires"("id_client");

-- CreateIndex
CREATE INDEX "affaires_est_actif_idx" ON "affaires"("est_actif");

-- CreateIndex
CREATE UNIQUE INDEX "documents_numero_document_key" ON "documents"("numero_document");

-- CreateIndex
CREATE INDEX "documents_type_document_idx" ON "documents"("type_document");

-- CreateIndex
CREATE INDEX "documents_domaine_document_idx" ON "documents"("domaine_document");

-- CreateIndex
CREATE INDEX "documents_id_partenaire_idx" ON "documents"("id_partenaire");

-- CreateIndex
CREATE INDEX "documents_id_affaire_idx" ON "documents"("id_affaire");

-- CreateIndex
CREATE INDEX "documents_date_document_idx" ON "documents"("date_document");

-- CreateIndex
CREATE INDEX "documents_statut_document_idx" ON "documents"("statut_document");

-- CreateIndex
CREATE INDEX "lignes_documents_id_document_idx" ON "lignes_documents"("id_document");

-- CreateIndex
CREATE INDEX "lignes_documents_id_produit_idx" ON "lignes_documents"("id_produit");

-- CreateIndex
CREATE INDEX "lignes_documents_id_affaire_idx" ON "lignes_documents"("id_affaire");

-- CreateIndex
CREATE INDEX "historique_prix_achats_id_produit_idx" ON "historique_prix_achats"("id_produit");

-- CreateIndex
CREATE INDEX "historique_prix_achats_date_achat_idx" ON "historique_prix_achats"("date_achat");

-- CreateIndex
CREATE INDEX "mouvements_stock_id_produit_idx" ON "mouvements_stock"("id_produit");

-- CreateIndex
CREATE INDEX "mouvements_stock_id_entrepot_idx" ON "mouvements_stock"("id_entrepot");

-- CreateIndex
CREATE INDEX "mouvements_stock_date_mouvement_idx" ON "mouvements_stock"("date_mouvement");

-- CreateIndex
CREATE UNIQUE INDEX "lots_serie_code_lot_id_produit_key" ON "lots_serie"("code_lot", "id_produit");

-- AddForeignKey
ALTER TABLE "categories_produits" ADD CONSTRAINT "categories_produits_id_categorie_parent_fkey" FOREIGN KEY ("id_categorie_parent") REFERENCES "categories_produits"("id_categorie") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produits" ADD CONSTRAINT "produits_id_categorie_fkey" FOREIGN KEY ("id_categorie") REFERENCES "categories_produits"("id_categorie") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produits" ADD CONSTRAINT "produits_id_fournisseur_principal_fkey" FOREIGN KEY ("id_fournisseur_principal") REFERENCES "partenaires"("id_partenaire") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarifs_fournisseurs" ADD CONSTRAINT "tarifs_fournisseurs_id_produit_fkey" FOREIGN KEY ("id_produit") REFERENCES "produits"("id_produit") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarifs_fournisseurs" ADD CONSTRAINT "tarifs_fournisseurs_id_fournisseur_fkey" FOREIGN KEY ("id_fournisseur") REFERENCES "partenaires"("id_partenaire") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "niveaux_stock" ADD CONSTRAINT "niveaux_stock_id_produit_fkey" FOREIGN KEY ("id_produit") REFERENCES "produits"("id_produit") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "niveaux_stock" ADD CONSTRAINT "niveaux_stock_id_entrepot_fkey" FOREIGN KEY ("id_entrepot") REFERENCES "entrepots"("id_entrepot") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affaires" ADD CONSTRAINT "affaires_id_client_fkey" FOREIGN KEY ("id_client") REFERENCES "partenaires"("id_partenaire") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_id_partenaire_fkey" FOREIGN KEY ("id_partenaire") REFERENCES "partenaires"("id_partenaire") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_id_affaire_fkey" FOREIGN KEY ("id_affaire") REFERENCES "affaires"("id_affaire") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_id_entrepot_fkey" FOREIGN KEY ("id_entrepot") REFERENCES "entrepots"("id_entrepot") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_documents" ADD CONSTRAINT "lignes_documents_id_document_fkey" FOREIGN KEY ("id_document") REFERENCES "documents"("id_document") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_documents" ADD CONSTRAINT "lignes_documents_id_produit_fkey" FOREIGN KEY ("id_produit") REFERENCES "produits"("id_produit") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_documents" ADD CONSTRAINT "lignes_documents_id_affaire_fkey" FOREIGN KEY ("id_affaire") REFERENCES "affaires"("id_affaire") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_documents" ADD CONSTRAINT "lignes_documents_id_lot_fkey" FOREIGN KEY ("id_lot") REFERENCES "lots_serie"("id_lot") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_prix_achats" ADD CONSTRAINT "historique_prix_achats_id_produit_fkey" FOREIGN KEY ("id_produit") REFERENCES "produits"("id_produit") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_prix_achats" ADD CONSTRAINT "historique_prix_achats_id_fournisseur_fkey" FOREIGN KEY ("id_fournisseur") REFERENCES "partenaires"("id_partenaire") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_stock" ADD CONSTRAINT "mouvements_stock_id_produit_fkey" FOREIGN KEY ("id_produit") REFERENCES "produits"("id_produit") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_stock" ADD CONSTRAINT "mouvements_stock_id_entrepot_fkey" FOREIGN KEY ("id_entrepot") REFERENCES "entrepots"("id_entrepot") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lots_serie" ADD CONSTRAINT "lots_serie_id_produit_fkey" FOREIGN KEY ("id_produit") REFERENCES "produits"("id_produit") ON DELETE CASCADE ON UPDATE CASCADE;

