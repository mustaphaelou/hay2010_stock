import { Prisma } from '@/lib/generated/prisma/client'

// =====================================================
// AUTH TYPES
// =====================================================

export type UserRole = 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER'

export type AuthUser = {
  id: string
  email: string
  name: string
  role?: UserRole
}

export type { PaginatedResult, PaginationMeta, PaginationParams } from '@/lib/pagination'

// =====================================================
// PRODUCT TYPES
// =====================================================

export type ArticleWithStock = {
  id_produit: number
  code_produit: string
  nom_produit: string
  famille: string | null
  id_categorie: number | null
  description_produit: string | null
  code_barre_ean: string | null
  unite_mesure: string
  poids_kg: Prisma.Decimal | null
  volume_m3: Prisma.Decimal | null
  prix_achat: Prisma.Decimal | null
  prix_dernier_achat: Prisma.Decimal | null
  coefficient: Prisma.Decimal | null
  prix_vente: Prisma.Decimal | null
  prix_gros: Prisma.Decimal | null
  taux_tva: Prisma.Decimal | null
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
  date_creation: Date
  date_modification: Date
  cree_par: string | null
  modifie_par: string | null
  compte_general_vente: string | null
  compte_general_achat: string | null
  code_taxe_vente: string | null
  code_taxe_achat: string | null
  categorie: {
    id_categorie: number
    code_categorie: string
    nom_categorie: string
    description_categorie: string | null
    est_actif: boolean
  } | null
  niveaux_stock: {
    id_stock: number
    id_produit: number
    id_entrepot: number
    quantite_en_stock: Prisma.Decimal
    quantite_reservee: Prisma.Decimal
    quantite_commandee: Prisma.Decimal
    date_dernier_mouvement: Date | null
    type_dernier_mouvement: string | null
  }[]
  stock_global: number
}

// =====================================================
// STOCK TYPES
// =====================================================

export type StockLevelWithProduct = {
  id_stock: number
  id_produit: number
  id_entrepot: number
  quantite_en_stock: Prisma.Decimal
  quantite_reservee: Prisma.Decimal
  quantite_commandee: Prisma.Decimal
  date_dernier_mouvement: Date | null
  type_dernier_mouvement: string | null
  date_creation: Date
  date_modification: Date
  produit: {
    nom_produit: string
    code_produit: string
    prix_achat: Prisma.Decimal | null
  } | null
  entrepot: {
    nom_entrepot: string
    id_entrepot: number
  } | null
  quantite_en_stock_num: number
  quantite_reservee_num: number
  cout_moyen_pondere: number
  valeur_stock: number
}

export type Depot = {
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
  date_creation: Date
  date_modification: Date
  id_depot: number
  nom_depot: string
}

// =====================================================
// DOCUMENT TYPES
// =====================================================

export type DocumentBase = {
  id_document: number
  numero_document: string
  type_document: string
  domaine_document: string
  etat_document: string
  id_partenaire: number
  nom_partenaire_snapshot: string | null
  id_affaire: number | null
  numero_affaire: string | null
  date_document: Date
  date_echeance: Date | null
  date_livraison: Date | null
  date_livraison_prevue: Date | null
  montant_ht: Prisma.Decimal
  montant_remise_total: Prisma.Decimal
  montant_tva_total: Prisma.Decimal
  montant_ttc: Prisma.Decimal
  solde_du: Prisma.Decimal
  code_devise: string
  taux_change: Prisma.Decimal
  statut_document: string
  est_entierement_paye: boolean
  id_entrepot: number | null
  notes_internes: string | null
  notes_client: string | null
  reference_externe: string | null
  date_creation: Date
  date_modification: Date
  cree_par: string | null
  modifie_par: string | null
  mode_expedition: string | null
  poids_total_brut: Prisma.Decimal | null
  nombre_colis: number | null
  partenaire: {
    nom_partenaire: string
    type_partenaire: string
  } | null
}

export type DocumentWithComputed = DocumentBase & {
  montant_ht_num: number
  montant_ttc_num: number
  solde_du_num: number
  montant_regle: number
  numero_piece: string
  nom_tiers: string | null
  reference: string | null
  montant_tva_num: number
  montant_remise_num: number
  type_document_num: number
  statut_document_num: number
  domaine: string
}

export type DocumentLine = {
  id_ligne: number
  id_document: number
  numero_ligne: number
  id_affaire: number | null
  numero_affaire: string | null
  id_produit: number
  code_produit_snapshot: string | null
  nom_produit_snapshot: string | null
  quantite_commandee: Prisma.Decimal
  quantite_livree: Prisma.Decimal
  quantite_facturee: Prisma.Decimal
  prix_unitaire_ht: Prisma.Decimal
  pourcentage_remise: Prisma.Decimal
  taux_tva: Prisma.Decimal
  montant_remise: Prisma.Decimal
  montant_ht: Prisma.Decimal
  montant_tva: Prisma.Decimal
  montant_ttc: Prisma.Decimal
  statut_ligne: string
  notes_ligne: string | null
  id_lot: number | null
  date_creation: Date
  date_modification: Date
  produit: {
    nom_produit: string
  } | null
  quantite: number
  prix_unitaire: number
  montant_ht_num: number
  montant_ttc_num: number
  designation: string | null
  reference_article: string | null
  ordre: number
  code_taxe: string | null
}

// =====================================================
// PARTNER TYPES
// =====================================================

export type PartnerWithComputed = {
  id_partenaire: number
  code_partenaire: string
  nom_partenaire: string
  type_partenaire: string
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
  limite_credit: Prisma.Decimal | null
  pourcentage_remise: number
  numero_compte_bancaire: string | null
  code_banque: string | null
  numero_iban: string | null
  code_swift: string | null
  est_actif: boolean
  est_bloque: boolean
  date_creation: Date
  date_modification: Date
  cree_par: string | null
  modifie_par: string | null
  compte_collectif: string | null
  compte_auxiliaire: string | null
  plafond_credit: number
  solde_courant: number
}

// =====================================================
// DASHBOARD TYPES
// =====================================================

export type MonthlyDataPoint = {
  month: string
  ventes: number
  achats: number
}

export type SalesInvoice = {
  montant_ttc: Prisma.Decimal
  solde_du: Prisma.Decimal
  date_document: Date
  montant_regle: number
}

export type DashboardStats = {
  clients: number
  suppliers: number
  products: number
  families: number
  salesCount: number
  purchasesCount: number
  lowStockCount: number
  totalStockProducts: number
  totalSalesAmount: number
  totalPurchasesAmount: number
  monthlyRevenue?: number
  pendingOrders?: number
}

export type DashboardData = {
  stats: DashboardStats
  recentDocs: DocumentBase[]
  salesInvoices: SalesInvoice[]
  monthlyData: MonthlyDataPoint[]
}

export type DashboardDataWithComputed = {
  stats: DashboardStats
  recentDocs: DocumentWithComputed[]
  salesInvoices: SalesInvoice[]
}
