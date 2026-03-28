// TypeScript types for database entities - Sage 100 Commercial Clone
// These types match the Prisma schema and can be used throughout the application

// =====================================================
// PARTENAIRES (Clients & Fournisseurs)
// =====================================================
export interface Partenaire {
  id_partenaire: number
  code_partenaire: string
  nom_partenaire: string
  type_partenaire: 'CLIENT' | 'FOURNISSEUR' | 'LES_DEUX'
  adresse_email: string | null
  numero_telephone: string | null
  numero_fax: string | null
  url_site_web: string | null
  adresse_rue: string | null
  code_postal: string | null
  ville: string | null
  pays: string | null
  numero_tva: string | null
  numero_ice: string | null
  numero_rc: string | null
  delai_paiement_jours: number | null
  limite_credit: number | null
  pourcentage_remise: number | null
  numero_compte_bancaire: string | null
  code_banque: string | null
  numero_iban: string | null
  code_swift: string | null
  est_actif: boolean
  est_bloque: boolean
  date_creation: string
  date_modification: string
  cree_par: string | null
  modifie_par: string | null
  compte_collectif: string | null
  compte_auxiliaire: string | null
}

// =====================================================
// CATEGORIES PRODUITS (Familles)
// =====================================================
export interface CategorieProduit {
  id_categorie: number
  code_categorie: string
  nom_categorie: string
  id_categorie_parent: number | null
  description_categorie: string | null
  est_actif: boolean
  date_creation: string
  date_modification: string
}

// =====================================================
// ENTREPOTS (Dépôts)
// =====================================================
export interface Entrepot {
  id_entrepot: number
  code_entrepot: string
  nom_entrepot: string
  adresse_entrepot: string | null
  ville_entrepot: string | null
  code_postal_entrepot: string | null
  capacite_totale_unites: number | null
  nom_responsable: string | null
  email_responsable: string | null
  telephone_responsable: string | null
  est_actif: boolean
  est_entrepot_principal: boolean
  date_creation: string
  date_modification: string
}

// =====================================================
// PRODUITS (Articles)
// =====================================================
export interface Produit {
  id_produit: number
  code_produit: string
  nom_produit: string
  id_categorie: number | null
  famille: string | null
  description_produit: string | null
  code_barre_ean: string | null
  unite_mesure: string
  poids_kg: number | null
  volume_m3: number | null
  prix_achat: number | null
  prix_dernier_achat: number | null
  coefficient: number | null
  prix_vente: number | null
  prix_gros: number | null
  taux_tva: number | null
  type_suivi_stock: string | null
  quantite_min_commande: number | null
  niveau_reappro_quantite: number | null
  stock_minimum: number | null
  stock_maximum: number | null
  activer_suivi_stock: boolean
  id_fournisseur_principal: number | null
  reference_fournisseur: string | null
  delai_livraison_fournisseur_jours: number | null
  est_actif: boolean
  en_sommeil: boolean
  est_abandonne: boolean
  date_creation: string
  date_modification: string
  cree_par: string | null
  modifie_par: string | null
  categories_produits?: CategorieProduit
  fournisseur_principal?: Partenaire
  compte_general_vente: string | null
  compte_general_achat: string | null
  code_taxe_vente: string | null
  code_taxe_achat: string | null
}

// =====================================================
// DOCUMENTS (Ventes & Achats)
// =====================================================
export type TypeDocument =
  | 'DEVIS' | 'BON_COMMANDE' | 'PREPARATION_LIVRAISON' | 'BON_LIVRAISON'
  | 'BON_RETOUR' | 'BON_AVOIR_FINANCIER' | 'FACTURE' | 'FACTURE_COMPTABILISEE'
  | 'DEMANDE_ACHAT' | 'PREPARATION_COMMANDE' | 'COMMANDE_ACHAT'
  | 'BON_RECEPTION' | 'FACTURE_ACHAT'

export type DomaineDocument = 'VENTE' | 'ACHAT'
export type EtatDocument = 'Saisi' | 'A comptabiliser' | 'Confirmé'
export type StatutDocument = 'BROUILLON' | 'CONFIRME' | 'EXPEDITION' | 'LIVRE' | 'FACTURE' | 'ANNULE' | 'POSTE'

export interface Document {
  id_document: number
  numero_document: string
  type_document: TypeDocument
  domaine_document: DomaineDocument
  etat_document: EtatDocument
  id_partenaire: number
  nom_partenaire_snapshot: string | null
  id_affaire: number | null
  numero_affaire: string | null
  date_document: string
  date_echeance: string | null
  date_livraison: string | null
  date_livraison_prevue: string | null
  montant_ht: number
  montant_remise_total: number
  montant_tva_total: number
  montant_ttc: number
  solde_du: number
  code_devise: string
  taux_change: number
  statut_document: StatutDocument
  est_entierement_paye: boolean
  id_entrepot: number | null
  notes_internes: string | null
  notes_client: string | null
  reference_externe: string | null
  date_creation: string
  date_modification: string
  cree_par: string | null
  modifie_par: string | null
  partenaires?: Partenaire
  affaires?: Affaire
  entrepots?: Entrepot
  mode_expedition: string | null
  poids_total_brut: number | null
  nombre_colis: number | null
}

// =====================================================
// LIGNES DOCUMENTS
// =====================================================
export type StatutLigne = 'EN_ATTENTE' | 'PARTIELLE' | 'COMPLETE' | 'ANNULEE'

export interface LigneDocument {
  id_ligne: number
  id_document: number
  numero_ligne: number
  id_affaire: number | null
  numero_affaire: string | null
  id_produit: number
  code_produit_snapshot: string | null
  nom_produit_snapshot: string | null
  quantite_commandee: number
  quantite_livree: number
  quantite_facturee: number
  prix_unitaire_ht: number
  pourcentage_remise: number
  taux_tva: number
  montant_remise: number
  montant_ht: number
  montant_tva: number
  montant_ttc: number
  statut_ligne: StatutLigne
  notes_ligne: string | null
  date_creation: string
  date_modification: string
  documents?: Document
  produits?: Produit
  affaires?: Affaire
  id_lot: number | null
}

// =====================================================
// AFFAIRES (Projets / Codes Affaires)
// =====================================================
export type TypeAffaire = 'Proposition' | 'Accepté' | 'Perdu' | 'En cours' | 'En attente' | 'Terminé'

export interface Affaire {
  id_affaire: number
  code_affaire: string
  intitule_affaire: string
  type_affaire: TypeAffaire
  statut_affaire: string | null
  abrege: string | null
  id_client: number | null
  date_debut: string | null
  date_fin_prevue: string | null
  date_fin_reelle: string | null
  budget_prevu: number | null
  chiffre_affaires: number | null
  marge: number | null
  taux_remise_moyen: number | null
  notes: string | null
  est_actif: boolean
  en_sommeil: boolean
  date_creation: string
  date_modification: string
  cree_par: string | null
  modifie_par: string | null
  partenaires?: Partenaire
}

// =====================================================
// MOUVEMENTS STOCK
// =====================================================
export type TypeMouvement = 'ENTREE' | 'SORTIE' | 'TRANSFERT' | 'AJUSTEMENT' | 'INVENTAIRE'

export interface MouvementStock {
  id_mouvement: number
  id_produit: number
  id_entrepot: number
  id_document: number | null
  id_ligne_document: number | null
  type_mouvement: TypeMouvement
  quantite: number
  date_mouvement: string
  reference_document: string | null
  motif: string | null
  cree_par: string | null
  date_creation: string
  produits?: Produit
  entrepots?: Entrepot
  documents?: Document
  id_lot: number | null
}

// =====================================================
// LOTS & SERIES (Traceability)
// =====================================================
export interface LotsSerie {
  id_lot: number
  code_lot: string
  id_produit: number
  date_fabrication: string | null
  date_peremption: string | null
  numero_serie_unique: string | null
  quantite_initiale: number | null
  quantite_actuelle: number
  est_actif: boolean
  date_creation: string
}

// =====================================================
// USER
// =====================================================
export type UserRole = 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER'

export interface User {
  id: string
  email: string
  password: string
  name: string
  role: UserRole
  createdAt: Date
}
