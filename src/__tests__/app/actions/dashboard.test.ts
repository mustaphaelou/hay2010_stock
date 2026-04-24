import { describe, it, expect, beforeEach, vi } from 'vitest'

const { mockRequireAuth } = vi.hoisted(() => ({
  mockRequireAuth: vi.fn().mockResolvedValue({ id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' }),
}))

const { mockVersionedCacheGet, mockVersionedCacheSet } = vi.hoisted(() => ({
  mockVersionedCacheGet: vi.fn().mockResolvedValue(null),
  mockVersionedCacheSet: vi.fn().mockResolvedValue(true),
}))

const { mockPrismaQueryRaw } = vi.hoisted(() => ({
  mockPrismaQueryRaw: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $queryRaw: mockPrismaQueryRaw,
  },
}))

vi.mock('@/lib/auth/user-utils', () => ({
  requireAuth: mockRequireAuth,
}))

vi.mock('@/lib/cache/versioned', () => ({
  VersionedCacheService: {
    get: mockVersionedCacheGet,
    set: mockVersionedCacheSet,
  },
  CacheNamespaces: { PRODUCT: 'product', STOCK: 'stock', PARTNER: 'partner', DOCUMENT: 'document', USER: 'user', DASHBOARD: 'dashboard' },
  CacheTTLSeconds: { PRODUCT: 900, STOCK: 60, PARTNER: 3600, DOCUMENT: 300, USER: 3600, DASHBOARD: 30 },
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

import { getDashboardStats } from '@/app/actions/dashboard'

describe('Dashboard Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAuth.mockResolvedValue({ id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' })
    mockVersionedCacheGet.mockResolvedValue(null)
    mockVersionedCacheSet.mockResolvedValue(true)
  })

  describe('getDashboardStats', () => {
    it('should require authentication', async () => {
      mockRequireAuth.mockRejectedValue(new Error('Unauthorized'))

      await expect(getDashboardStats()).rejects.toThrow('Unauthorized')
    })

    it('should return cached data when available', async () => {
      const cached = {
        stats: { clients: 10, suppliers: 5, products: 100, families: 10, salesCount: 50, purchasesCount: 30, lowStockCount: 2, totalStockProducts: 80, totalSalesAmount: 50000, totalPurchasesAmount: 20000 },
        recentDocs: [],
        salesInvoices: [],
        monthlyData: [],
      }
      mockVersionedCacheGet.mockResolvedValue(cached)

      const result = await getDashboardStats()

      expect(result).toEqual(cached)
      expect(mockPrismaQueryRaw).not.toHaveBeenCalled()
    })

    it('should query and process dashboard stats', async () => {
      const mockCounts = [{
        clients: BigInt(10),
        suppliers: BigInt(5),
        products: BigInt(100),
        families: BigInt(10),
        sales: BigInt(50),
        purchases: BigInt(30),
        low_stock: BigInt(2),
        total_stock_products: BigInt(80),
        total_sales_amount: 50000,
        total_purchases_amount: 20000,
      }]
      const mockMonthly = [
        { month: 'Jan 26', ventes: 1000, achats: 500 },
      ]
      const mockRecentDocs: any[] = []
      const mockSalesInvoices: any[] = []

      mockPrismaQueryRaw
        .mockResolvedValueOnce(mockCounts)
        .mockResolvedValueOnce(mockMonthly)
        .mockResolvedValueOnce(mockRecentDocs)
        .mockResolvedValueOnce(mockSalesInvoices)

      const result = await getDashboardStats()

      expect(result.stats.clients).toBe(10)
      expect(result.stats.products).toBe(100)
      expect(result.stats.totalSalesAmount).toBe(50000)
      expect(result.monthlyData).toBeDefined()
      expect(result.recentDocs).toEqual([])
      expect(result.salesInvoices).toEqual([])
      expect(mockVersionedCacheSet).toHaveBeenCalled()
    })

    it('should return zeroed stats on error', async () => {
      mockPrismaQueryRaw.mockRejectedValue(new Error('DB error'))

      const result = await getDashboardStats()

      expect(result.stats.clients).toBe(0)
      expect(result.stats.products).toBe(0)
      expect(result.recentDocs).toEqual([])
      expect(result.salesInvoices).toEqual([])
      expect(result.monthlyData).toEqual([])
    })
  })
})
