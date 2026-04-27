import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@/lib/generated/prisma/client'
import type { DashboardStats, SalesInvoice, DocumentBase, MonthlyDataPoint } from '@/lib/types'

const SIX_MONTHS_AGO = new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1)

interface CountsRow {
  clients: bigint
  suppliers: bigint
  products: bigint
  families: bigint
  sales: bigint
  purchases: bigint
  low_stock: bigint
  total_stock_products: bigint
  total_sales_amount: number
  total_purchases_amount: number
}

interface MonthlyRow {
  month: string
  ventes: number
  achats: number
}

interface RecentDocRow {
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
  nom_partenaire: string | null
  type_partenaire: string | null
}

interface SalesInvoiceRow {
  id_document: number
  numero_document: string
  type_document: string
  domaine_document: string
  montant_ttc: Prisma.Decimal
  solde_du: Prisma.Decimal
  date_document: Date
  montant_ht: Prisma.Decimal
  montant_remise_total: Prisma.Decimal
  montant_tva_total: Prisma.Decimal
}

export async function runStatsQueries() {
  const [countsResult, monthlyResult, recentDocsResult, salesInvoicesResult] = await Promise.all([
    prisma.$queryRaw<Array<CountsRow>>`
      SELECT
        (SELECT COUNT(*) FROM partenaires WHERE type_partenaire IN ('CLIENT', 'LES_DEUX')) AS clients,
        (SELECT COUNT(*) FROM partenaires WHERE type_partenaire IN ('FOURNISSEUR', 'LES_DEUX')) AS suppliers,
        (SELECT COUNT(*) FROM produits) AS products,
        (SELECT COUNT(*) FROM categories_produits) AS families,
        (SELECT COUNT(*) FROM documents WHERE domaine_document = 'VENTE') AS sales,
        (SELECT COUNT(*) FROM documents WHERE domaine_document = 'ACHAT') AS purchases,
        (SELECT COUNT(*) FROM produits p JOIN niveaux_stock ns ON ns.id_produit = p.id_produit
          WHERE p.activer_suivi_stock = true AND ns.quantite_en_stock <= COALESCE(p.niveau_reappro_quantite, 0)) AS low_stock,
        (SELECT COUNT(*) FROM produits WHERE activer_suivi_stock = true) AS total_stock_products,
        COALESCE((SELECT SUM(montant_ttc) FROM documents WHERE domaine_document = 'VENTE'), 0)::float AS total_sales_amount,
        COALESCE((SELECT SUM(montant_ttc) FROM documents WHERE domaine_document = 'ACHAT'), 0)::float AS total_purchases_amount
    `,
    prisma.$queryRaw<Array<MonthlyRow>>`
      SELECT
        TO_CHAR(date_trunc('month', date_document), 'Mon YY') AS month,
        COALESCE(SUM(CASE WHEN domaine_document = 'VENTE' THEN montant_ttc ELSE 0 END), 0)::float AS ventes,
        COALESCE(SUM(CASE WHEN domaine_document = 'ACHAT' THEN montant_ttc ELSE 0 END), 0)::float AS achats
      FROM documents
      WHERE type_document IN ('Facture', 'Avoir')
        AND date_document >= ${SIX_MONTHS_AGO}
      GROUP BY date_trunc('month', date_document)
      ORDER BY date_trunc('month', date_document) ASC
      LIMIT 6
    `,
    prisma.$queryRaw<Array<RecentDocRow>>`
      SELECT
        d.id_document, d.numero_document, d.type_document, d.domaine_document, d.etat_document,
        d.id_partenaire, d.nom_partenaire_snapshot, d.id_affaire, d.numero_affaire,
        d.date_document, d.date_echeance, d.date_livraison, d.date_livraison_prevue,
        d.montant_ht, d.montant_remise_total, d.montant_tva_total, d.montant_ttc, d.solde_du,
        d.code_devise, d.taux_change, d.statut_document, d.est_entierement_paye,
        d.id_entrepot, d.notes_internes, d.notes_client, d.reference_externe,
        d.date_creation, d.date_modification, d.cree_par, d.modifie_par,
        d.mode_expedition, d.poids_total_brut, d.nombre_colis,
        p.nom_partenaire, p.type_partenaire
      FROM documents d
      LEFT JOIN partenaires p ON d.id_partenaire = p.id_partenaire
      ORDER BY d.date_creation DESC
      LIMIT 5
    `,
    prisma.$queryRaw<Array<SalesInvoiceRow>>`
      SELECT id_document, numero_document, type_document, domaine_document,
        montant_ttc, solde_du, date_document, montant_ht, montant_remise_total, montant_tva_total
      FROM documents
      WHERE domaine_document = 'VENTE' AND type_document IN ('Facture', 'Avoir')
      ORDER BY date_document DESC
      LIMIT 100
    `,
  ])

  return { countsResult, monthlyResult, recentDocsResult, salesInvoicesResult }
}

export function buildStats(countsResult: Array<CountsRow>): DashboardStats {
  const c = countsResult[0]
  return {
    clients: Number(c?.clients ?? 0),
    suppliers: Number(c?.suppliers ?? 0),
    products: Number(c?.products ?? 0),
    families: Number(c?.families ?? 0),
    salesCount: Number(c?.sales ?? 0),
    purchasesCount: Number(c?.purchases ?? 0),
    lowStockCount: Number(c?.low_stock ?? 0),
    totalStockProducts: Number(c?.total_stock_products ?? 0),
    totalSalesAmount: c?.total_sales_amount ?? 0,
    totalPurchasesAmount: c?.total_purchases_amount ?? 0,
  }
}

export function buildRecentDocs(recentDocsResult: Array<RecentDocRow>): DocumentBase[] {
  return recentDocsResult.map((doc): DocumentBase => ({
    id_document: doc.id_document,
    numero_document: doc.numero_document,
    type_document: doc.type_document,
    domaine_document: doc.domaine_document,
    etat_document: doc.etat_document,
    id_partenaire: doc.id_partenaire,
    nom_partenaire_snapshot: doc.nom_partenaire_snapshot,
    id_affaire: doc.id_affaire,
    numero_affaire: doc.numero_affaire,
    date_document: doc.date_document,
    date_echeance: doc.date_echeance,
    date_livraison: doc.date_livraison,
    date_livraison_prevue: doc.date_livraison_prevue,
    montant_ht: doc.montant_ht,
    montant_remise_total: doc.montant_remise_total,
    montant_tva_total: doc.montant_tva_total,
    montant_ttc: doc.montant_ttc,
    solde_du: doc.solde_du,
    code_devise: doc.code_devise,
    taux_change: doc.taux_change,
    statut_document: doc.statut_document,
    est_entierement_paye: doc.est_entierement_paye,
    id_entrepot: doc.id_entrepot,
    notes_internes: doc.notes_internes,
    notes_client: doc.notes_client,
    reference_externe: doc.reference_externe,
    date_creation: doc.date_creation,
    date_modification: doc.date_modification,
    cree_par: doc.cree_par,
    modifie_par: doc.modifie_par,
    mode_expedition: doc.mode_expedition,
    poids_total_brut: doc.poids_total_brut,
    nombre_colis: doc.nombre_colis,
    partenaire: doc.nom_partenaire ? {
      nom_partenaire: doc.nom_partenaire,
      type_partenaire: doc.type_partenaire || '',
    } : null,
  }))
}

export function buildSalesInvoices(salesInvoicesResult: Array<SalesInvoiceRow>): SalesInvoice[] {
  return salesInvoicesResult.map((s): SalesInvoice => ({
    montant_ttc: s.montant_ttc,
    solde_du: s.solde_du,
    date_document: s.date_document,
    montant_regle: Number(s.montant_ttc) - Number(s.solde_du),
  }))
}

export function fillMonthlyData(monthlyResult: Array<MonthlyRow>): MonthlyDataPoint[] {
  const monthlyMap = new Map<string, { ventes: number; achats: number }>()
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
    monthlyMap.set(key, { ventes: 0, achats: 0 })
  }

  for (const row of monthlyResult) {
    if (monthlyMap.has(row.month)) {
      monthlyMap.set(row.month, { ventes: row.ventes, achats: row.achats })
    }
  }

  return Array.from(monthlyMap.entries()).map(([month, data]) => ({
    month,
    ventes: data.ventes,
    achats: data.achats,
  }))
}
