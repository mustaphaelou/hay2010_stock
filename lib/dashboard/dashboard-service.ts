import { VersionedCacheService, CacheNamespaces, CacheTTLSeconds } from '@/lib/cache/versioned'
import type { DashboardData} from '@/lib/types'
import { createLogger } from '@/lib/logger'
import {
  runStatsQueries,
  buildStats,
  buildRecentDocs,
  buildSalesInvoices,
  fillMonthlyData,
} from './stats-query'
import { runDashboardDataQueries } from './data-query'
import type { DashboardDataResult } from './data-query'

const log = createLogger('dashboard-service')

export type { DashboardDataResult }
export type {
  DashboardProductData,
  DashboardPartnerData,
  DashboardDocumentData,
  DashboardMovementData,
} from './data-query'

export async function getDashboardStats(): Promise<DashboardData> {
  const cacheKey = 'stats'

  try {
    const cached = await VersionedCacheService.get<DashboardData>(CacheNamespaces.DASHBOARD, cacheKey)
    if (cached) return cached

    const { countsResult, monthlyResult, recentDocsResult, salesInvoicesResult } = await runStatsQueries()

    const stats = buildStats(countsResult)
    const recentDocs = buildRecentDocs(recentDocsResult)
    const salesInvoices = buildSalesInvoices(salesInvoicesResult)
    const monthlyData = fillMonthlyData(monthlyResult)

    const result = { stats, recentDocs, salesInvoices, monthlyData }

    await VersionedCacheService.set(CacheNamespaces.DASHBOARD, cacheKey, result, CacheTTLSeconds.DASHBOARD)

    return result
  } catch (error) {
    log.error({ error }, 'Failed to fetch dashboard stats')
    return {
      stats: {
        clients: 0, suppliers: 0, products: 0, families: 0,
        salesCount: 0, purchasesCount: 0, lowStockCount: 0,
        totalStockProducts: 0, totalSalesAmount: 0, totalPurchasesAmount: 0,
      },
      recentDocs: [],
      salesInvoices: [],
      monthlyData: [],
    }
  }
}

export async function getDashboardData(): Promise<DashboardDataResult> {
  try {
    return await runDashboardDataQueries()
  } catch (error) {
    log.error({ error }, 'Failed to fetch dashboard data')
    return { products: [], partners: [], documents: [], movements: [] }
  }
}
