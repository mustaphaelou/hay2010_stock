import { getAdapter } from '@/lib/cache/adapter'
import { CacheNamespaces, CacheTTLSeconds } from '@/lib/cache/cache'
import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@/lib/generated/prisma/client'
import type { DashboardData, DashboardStats, SalesInvoice, DocumentWithComputed, MonthlyDataPoint, DashboardActivityItem, DashboardTopProduct, DashboardLowStockItem, DashboardMovementData } from '@/lib/types'
import { getRecentDocuments, getSalesInvoices } from '@/lib/documents/document-service'
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
  ruptures: bigint
}

interface LowStockItemRow {
  id_produit: number
  code_produit: string
  nom_produit: string
  id_entrepot: number
  nom_entrepot: string
  quantite_en_stock: number
  niveau_reappro_quantite: number | null
  status: 'rupture' | 'bas'
}

interface TodaysMovementRow {
  id_mouvement: number
  date_mouvement: Date
  code_produit: string | null
  nom_produit: string | null
  type_mouvement: string
  numero_document: string | null
  quantite: number
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

interface ActivityFeedRow {
  id: string
  type: string
  title: string
  description: string | null
  timestamp: Date
}

interface TopProductRow {
  id_produit: number
  nom_produit: string
  nom_categorie: string | null
  total_quantity: number
  total_revenue: number
  stock_level: number
}


async function runStatsQueries() {
  const todayStart = getServerLocalTodayStart()
  const [countsResult, monthlyResult, recentDocsRes, salesInvoicesRes, activityFeedResult, topProductsResult, lowStockItemsResult, todaysMovementsResult] = await Promise.all([
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
        COALESCE((SELECT SUM(montant_ttc) FROM documents WHERE domaine_document = 'ACHAT'), 0)::float AS total_purchases_amount,
        (SELECT COUNT(*) FROM produits p JOIN niveaux_stock ns ON ns.id_produit = p.id_produit
          WHERE p.activer_suivi_stock = true AND ns.quantite_en_stock = 0) AS ruptures
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
    getRecentDocuments(5),
    getSalesInvoices(100),
    prisma.$queryRaw<Array<ActivityFeedRow>>`
      SELECT id::text AS id, 'document' AS type, titre AS title, description, date_creation AS timestamp
      FROM (
        SELECT d.id_document AS id, d.numero_document AS titre, NULL::text AS description, d.date_creation
        FROM documents d
        ORDER BY d.date_creation DESC
        LIMIT 10
      ) doc_union
      UNION ALL
      SELECT id::text, 'stock_movement' AS type, designation AS title, NULL::text AS description, date_mouvement
      FROM (
        SELECT ms.id_mouvement AS id, ms.reference_document AS designation, ms.motif, ms.date_mouvement
        FROM mouvements_stock ms
        ORDER BY ms.date_mouvement DESC
        LIMIT 10
      ) mov_union
      UNION ALL
      SELECT id::text, 'partner' AS type, nom AS title, NULL::text AS description, date_creation
      FROM (
        SELECT p.id_partenaire AS id, p.nom_partenaire AS nom, NULL::text AS description, p.date_creation
        FROM partenaires p
        ORDER BY p.date_creation DESC
        LIMIT 10
      ) part_union
      ORDER BY timestamp DESC
      LIMIT 10
    `,
    prisma.$queryRaw<Array<TopProductRow>>`
      SELECT
        p.id_produit,
        p.nom_produit,
        cp.nom_categorie,
        COALESCE(SUM(ld.quantite_facturee), 0)::float AS total_quantity,
        COALESCE(SUM(ld.montant_ttc), 0)::float AS total_revenue,
        COALESCE(SUM(ns.quantite_en_stock), 0)::float AS stock_level
      FROM lignes_documents ld
      JOIN documents d ON d.id_document = ld.id_document
      JOIN produits p ON p.id_produit = ld.id_produit
      LEFT JOIN categories_produits cp ON cp.id_categorie = p.id_categorie
      LEFT JOIN niveaux_stock ns ON ns.id_produit = p.id_produit
      WHERE d.domaine_document = 'VENTE'
      GROUP BY p.id_produit, p.nom_produit, cp.nom_categorie
      ORDER BY SUM(ld.quantite_facturee) DESC
      LIMIT 10
    `,
    prisma.$queryRaw<Array<LowStockItemRow>>`
      SELECT
        p.id_produit,
        p.code_produit,
        p.nom_produit,
        e.id_entrepot,
        e.nom_entrepot,
        ns.quantite_en_stock::float AS quantite_en_stock,
        p.niveau_reappro_quantite,
        CASE WHEN ns.quantite_en_stock = 0 THEN 'rupture' ELSE 'bas' END AS status
      FROM niveaux_stock ns
      JOIN produits p ON p.id_produit = ns.id_produit
      JOIN entrepots e ON e.id_entrepot = ns.id_entrepot
      WHERE p.activer_suivi_stock = true
        AND ns.quantite_en_stock <= COALESCE(p.niveau_reappro_quantite, 0)
      ORDER BY
        CASE WHEN ns.quantite_en_stock = 0 THEN 0 ELSE 1 END ASC,
        (ns.quantite_en_stock / NULLIF(COALESCE(p.niveau_reappro_quantite, 0), 0)) ASC NULLS FIRST,
        p.nom_produit ASC
      LIMIT 6
    `,
    prisma.$queryRaw<Array<TodaysMovementRow>>`
      SELECT
        ms.id_mouvement,
        ms.date_mouvement,
        p.code_produit,
        p.nom_produit,
        ms.type_mouvement,
        d.numero_document,
        ms.quantite::float AS quantite
      FROM mouvements_stock ms
      LEFT JOIN produits p ON p.id_produit = ms.id_produit
      LEFT JOIN documents d ON d.id_document = ms.id_document
      WHERE ms.date_mouvement >= ${todayStart}
      ORDER BY ms.date_mouvement DESC
      LIMIT 8
    `,
  ])

  return {
    countsResult,
    monthlyResult,
    recentDocs: recentDocsRes.data,
    salesInvoices: salesInvoicesRes.data,
    activityFeedResult,
    topProductsResult,
    lowStockItemsResult,
    todaysMovementsResult
  }
}

function getServerLocalTodayStart(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
}

function buildStats(countsResult: Array<CountsRow>) {
  const c = countsResult[0]
  return {
    clients: Number(c?.clients ?? 0),
    suppliers: Number(c?.suppliers ?? 0),
    products: Number(c?.products ?? 0),
    families: Number(c?.families ?? 0),
    salesCount: Number(c?.sales ?? 0),
    purchasesCount: Number(c?.purchases ?? 0),
    lowStockCount: Number(c?.low_stock ?? 0),
    rupturesCount: Number(c?.ruptures ?? 0),
    totalStockProducts: Number(c?.total_stock_products ?? 0),
    totalSalesAmount: c?.total_sales_amount ?? 0,
    totalPurchasesAmount: c?.total_purchases_amount ?? 0,
  }
}

// Removed buildRecentDocs and buildSalesInvoices as we are now using document service APIs

function buildActivityFeed(activityFeedResult: Array<ActivityFeedRow>): DashboardActivityItem[] {
  return activityFeedResult.map((row): DashboardActivityItem => ({
    id: row.id,
    type: row.type as DashboardActivityItem['type'],
    title: row.title,
    description: row.description ?? undefined,
    timestamp: row.timestamp,
  }))
}

function buildTopProducts(topProductsResult: Array<TopProductRow>): DashboardTopProduct[] {
  return topProductsResult.map((row): DashboardTopProduct => ({
    id: String(row.id_produit),
    name: row.nom_produit,
    category: row.nom_categorie ?? 'Général',
    salesCount: row.total_quantity,
    revenue: row.total_revenue,
    trend: 0,
    trendDirection: 'neutral',
    stockLevel: row.stock_level,
  }))
}

function buildLowStockItems(lowStockItemsResult: Array<LowStockItemRow>): DashboardLowStockItem[] {
  return lowStockItemsResult.map((row): DashboardLowStockItem => ({
    id_produit: row.id_produit,
    code_produit: row.code_produit,
    nom_produit: row.nom_produit,
    id_entrepot: row.id_entrepot,
    nom_entrepot: row.nom_entrepot,
    quantite_en_stock: Number(row.quantite_en_stock ?? 0),
    niveau_reappro_quantite: row.niveau_reappro_quantite,
    status: row.status,
  }))
}

function buildTodaysMovements(todaysMovementsResult: Array<TodaysMovementRow>): DashboardMovementData[] {
  return todaysMovementsResult.map((row): DashboardMovementData => ({
    id: row.id_mouvement,
    date: row.date_mouvement ? new Date(row.date_mouvement).toLocaleDateString('fr-FR') : '',
    ref: row.code_produit ?? '',
    designation: row.nom_produit ?? '',
    type: row.type_mouvement,
    document: row.numero_document ?? '',
    quantity: Number(row.quantite ?? 0),
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

function computePaymentMetrics(salesInvoices: SalesInvoice[], salesCount: number) {
  let regle = 0
  let unpaidTotal = 0
  for (const inv of salesInvoices) {
    const ttc = Number(inv.montant_ttc)
    const reg = inv.montant_regle
    if (reg > 0 && reg >= ttc) regle++
    else unpaidTotal += ttc - reg
  }
  const unpaidCount = salesInvoices.length - regle
  const paymentRate = salesCount > 0 ? Math.round((regle / salesCount) * 100) : 0
  return { paymentRate, unpaidCount, unpaidTotal }
}

function computeStockAvailability(totalStockProducts: number, lowStockCount: number): number {
  return totalStockProducts > 0
    ? Math.round(((totalStockProducts - lowStockCount) / totalStockProducts) * 100)
    : 100
}

export async function getDashboardStats(): Promise<{ data: DashboardData; error?: string }> {
  const cacheKey = 'stats'

  try {
    const cached = await getAdapter().get<DashboardData>(CacheNamespaces.DASHBOARD, cacheKey)
    if (cached) return { data: cached, error: undefined }

    const { countsResult, monthlyResult, recentDocs, salesInvoices, activityFeedResult, topProductsResult, lowStockItemsResult, todaysMovementsResult } = await runStatsQueries()

    const baseStats = buildStats(countsResult)
    const monthlyData = fillMonthlyData(monthlyResult)
    const activities = buildActivityFeed(activityFeedResult)
    const topProducts = buildTopProducts(topProductsResult)
    const lowStockItems = buildLowStockItems(lowStockItemsResult)
    const todaysMovements = buildTodaysMovements(todaysMovementsResult)

    const { paymentRate, unpaidCount, unpaidTotal } = computePaymentMetrics(salesInvoices, baseStats.salesCount)
    const stockAvailability = computeStockAvailability(baseStats.totalStockProducts, baseStats.lowStockCount)

    const stats: DashboardStats = { ...baseStats, paymentRate, stockAvailability, unpaidCount, unpaidTotal }

    const result: DashboardData = { stats, recentDocs, salesInvoices, monthlyData, activities, topProducts, lowStockItems, todaysMovements }

    await getAdapter().set(CacheNamespaces.DASHBOARD, cacheKey, result, CacheTTLSeconds.DASHBOARD)

    return { data: result, error: undefined }
  } catch (error) {
    log.error({ error }, 'Failed to fetch dashboard stats')
    return {
      data: {
        stats: {
          clients: 0, suppliers: 0, products: 0, families: 0,
          salesCount: 0, purchasesCount: 0, lowStockCount: 0, rupturesCount: 0,
          totalStockProducts: 0, totalSalesAmount: 0, totalPurchasesAmount: 0,
          paymentRate: 0, stockAvailability: 100, unpaidCount: 0, unpaidTotal: 0,
        },
        recentDocs: [],
        salesInvoices: [],
        monthlyData: [],
        activities: [],
        topProducts: [],
        lowStockItems: [],
        todaysMovements: [],
      },
      error: 'Failed to fetch dashboard stats',
    }
  }
}


