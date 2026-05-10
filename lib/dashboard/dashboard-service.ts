import { VersionedCacheService, CacheNamespaces, CacheTTLSeconds } from '@/lib/cache/versioned'
import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@/lib/generated/prisma/client'
import type { DashboardData, DashboardStats, SalesInvoice, DocumentWithComputed, MonthlyDataPoint } from '@/lib/types'
import { mapDocumentToComputed } from '@/lib/documents/mapping'
import { createLogger } from '@/lib/logger'

const log = createLogger('dashboard-service')
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

export type DashboardProductData = {
  id_produit: number
  code_produit: string
  nom_produit: string
  prix_vente: number | null
  prix_achat: number | null
  stock_maximum: number | null
  niveau_reappro_quantite: number | null
  categories_produits?: { nom_categorie: string } | null
}

export type DashboardPartnerData = {
  id_partenaire: number
  code_partenaire: string
  nom_partenaire: string
  type_partenaire: string
  ville: string | null
  est_actif: boolean
}

export type DashboardDocumentData = {
  id_document: number
  numero_document: string
  date_document: Date
  type_document: string
  domaine_document: string
  montant_ttc: number
  montant_ht: number
  statut_document: string
  nom_partenaire_snapshot: string | null
  partenaire?: { nom_partenaire: string } | null
}

export type DashboardMovementData = {
  id: number
  date: string
  ref: string
  designation: string
  type: string
  document: string
  quantity: number
}

export type DashboardDataResult = {
  products: DashboardProductData[]
  partners: DashboardPartnerData[]
  documents: DashboardDocumentData[]
  movements: DashboardMovementData[]
}

async function runStatsQueries() {
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

function buildStats(countsResult: Array<CountsRow>): DashboardStats {
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

function buildRecentDocs(recentDocsResult: Array<RecentDocRow>): DocumentWithComputed[] {
  return recentDocsResult.map((doc) => mapDocumentToComputed({
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

function buildSalesInvoices(salesInvoicesResult: Array<SalesInvoiceRow>): SalesInvoice[] {
  return salesInvoicesResult.map((s): SalesInvoice => ({
    montant_ttc: s.montant_ttc,
    solde_du: s.solde_du,
    date_document: s.date_document,
    montant_regle: Number(s.montant_ttc) - Number(s.solde_du),
  }))
}

function fillMonthlyData(monthlyResult: Array<MonthlyRow>): MonthlyDataPoint[] {
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

async function runDashboardDataQueries(): Promise<DashboardDataResult> {
  const [productsRaw, partnersRaw, documentsRaw, lignesRaw] = await Promise.all([
    prisma.produit.findMany({
      where: { est_actif: true },
      include: { categorie: { select: { nom_categorie: true } } },
      orderBy: { nom_produit: 'asc' },
      take: 100
    }),
    prisma.partenaire.findMany({
      orderBy: { nom_partenaire: 'asc' },
      take: 100
    }),
    prisma.docVente.findMany({
      include: { partenaire: { select: { nom_partenaire: true } } },
      orderBy: { date_document: 'desc' },
      take: 100
    }),
    prisma.ligneDocument.findMany({
      include: {
        produit: { select: { nom_produit: true, code_produit: true } },
        document: { select: { numero_document: true, date_document: true, type_document: true } }
      },
      orderBy: { id_ligne: 'desc' },
      take: 20
    })
  ])

  const products: DashboardProductData[] = productsRaw.map(p => ({
    id_produit: p.id_produit,
    code_produit: p.code_produit,
    nom_produit: p.nom_produit,
    prix_vente: p.prix_vente ? Number(p.prix_vente) : null,
    prix_achat: p.prix_achat ? Number(p.prix_achat) : null,
    stock_maximum: p.stock_maximum,
    niveau_reappro_quantite: p.niveau_reappro_quantite,
    categories_produits: p.categorie ? { nom_categorie: p.categorie.nom_categorie } : null
  }))

  const partners: DashboardPartnerData[] = partnersRaw.map(p => ({
    id_partenaire: p.id_partenaire,
    code_partenaire: p.code_partenaire,
    nom_partenaire: p.nom_partenaire,
    type_partenaire: p.type_partenaire,
    ville: p.ville,
    est_actif: p.est_actif
  }))

  const documents: DashboardDocumentData[] = documentsRaw.map(d => ({
    id_document: d.id_document,
    numero_document: d.numero_document,
    date_document: d.date_document,
    type_document: d.type_document,
    domaine_document: d.domaine_document,
    montant_ttc: Number(d.montant_ttc),
    montant_ht: Number(d.montant_ht),
    statut_document: d.statut_document,
    nom_partenaire_snapshot: d.nom_partenaire_snapshot,
    partenaire: d.partenaire ? { nom_partenaire: d.partenaire.nom_partenaire } : null
  }))

  const movements: DashboardMovementData[] = lignesRaw.map(m => {
    const doc = m.document
    const produit = m.produit
    const typeDoc = doc?.type_document || ''
    const qty = Number(m.quantite_livree)

    let movementType = 'Ajustement'
    if (typeDoc === 'LIVRAISON') {
      movementType = qty > 0 ? 'Entrée' : 'Sortie'
    } else if (typeDoc === 'FACTURE') {
      movementType = 'Sortie'
    }

    return {
      id: m.id_ligne,
      date: doc?.date_document ? new Date(doc.date_document).toLocaleDateString('fr-FR') : '',
      ref: produit?.code_produit || '',
      designation: produit?.nom_produit || '',
      type: movementType,
      document: doc?.numero_document || '',
      quantity: qty
    }
  })

  return { products, partners, documents, movements }
}

export async function getDashboardStats(): Promise<{ data: DashboardData; error?: string }> {
  const cacheKey = 'stats'

  try {
    const cached = await VersionedCacheService.get<DashboardData>(CacheNamespaces.DASHBOARD, cacheKey)
    if (cached) return { data: cached }

    const { countsResult, monthlyResult, recentDocsResult, salesInvoicesResult } = await runStatsQueries()

    const stats = buildStats(countsResult)
    const recentDocs = buildRecentDocs(recentDocsResult)
    const salesInvoices = buildSalesInvoices(salesInvoicesResult)
    const monthlyData = fillMonthlyData(monthlyResult)

    const result = { stats, recentDocs, salesInvoices, monthlyData }

    await VersionedCacheService.set(CacheNamespaces.DASHBOARD, cacheKey, result, CacheTTLSeconds.DASHBOARD)

    return { data: result }
  } catch (error) {
    log.error({ error }, 'Failed to fetch dashboard stats')
    return {
      data: {
        stats: {
          clients: 0, suppliers: 0, products: 0, families: 0,
          salesCount: 0, purchasesCount: 0, lowStockCount: 0,
          totalStockProducts: 0, totalSalesAmount: 0, totalPurchasesAmount: 0,
        },
        recentDocs: [],
        salesInvoices: [],
        monthlyData: [],
      },
      error: 'Failed to fetch dashboard stats',
    }
  }
}

export async function getDashboardData(): Promise<{ data: DashboardDataResult; error?: string }> {
  const cacheKey = 'data'

  try {
    const cached = await VersionedCacheService.get<DashboardDataResult>(CacheNamespaces.DASHBOARD, cacheKey)
    if (cached) return { data: cached }

    const result = await runDashboardDataQueries()

    await VersionedCacheService.set(CacheNamespaces.DASHBOARD, cacheKey, result, CacheTTLSeconds.DASHBOARD)

    return { data: result }
  } catch (error) {
    log.error({ error }, 'Failed to fetch dashboard data')
    return { data: { products: [], partners: [], documents: [], movements: [] }, error: 'Failed to fetch dashboard data' }
  }
}
