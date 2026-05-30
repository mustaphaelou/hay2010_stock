import { describe, it, expect, beforeEach, vi } from 'vitest'

const { mockRequireAuth } = vi.hoisted(() => ({
  mockRequireAuth: vi.fn().mockResolvedValue({ id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' }),
}))

const { mockCacheGet, mockCacheSet } = vi.hoisted(() => ({
  mockCacheGet: vi.fn().mockResolvedValue(null),
  mockCacheSet: vi.fn().mockResolvedValue(true),
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

vi.mock('@/lib/cache/adapter', () => ({
  getAdapter: () => ({
    get: mockCacheGet,
    set: mockCacheSet,
  }),
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
    mockCacheGet.mockResolvedValue(null)
    mockCacheSet.mockResolvedValue(true)
  })

  describe('getDashboardStats', () => {
    it('should require authentication', async () => {
      mockRequireAuth.mockRejectedValue(new Error('Unauthorized'))

      await expect(getDashboardStats()).rejects.toThrow('Unauthorized')
    })

    it('should return { data, error?: undefined } when cached data available', async () => {
      const cached = {
        data: {
          stats: { clients: 10, suppliers: 5, products: 100, families: 10, salesCount: 50, purchasesCount: 30, lowStockCount: 2, totalStockProducts: 80, totalSalesAmount: 50000, totalPurchasesAmount: 20000, paymentRate: 50, stockAvailability: 98, unpaidCount: 5, unpaidTotal: 1000 },
          recentDocs: [],
          salesInvoices: [],
          monthlyData: [],
          activities: [],
          topProducts: [],
        },
      }
      mockCacheGet.mockResolvedValue(cached.data)

      const result = await getDashboardStats()

      expect(result.data?.stats.clients).toBe(10)
      expect(result.data?.stats.paymentRate).toBe(50)
      expect(result.data?.activities).toEqual([])
      expect(result.data?.topProducts).toEqual([])
      expect(result.error).toBeUndefined()
      expect(mockPrismaQueryRaw).not.toHaveBeenCalled()
    })

    it('should return { data, error?: undefined } on successful query', async () => {
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
      const mockRecentDocs: Record<string, unknown>[] = []
      const mockSalesInvoices: Record<string, unknown>[] = []
      const mockActivityFeed: Record<string, unknown>[] = []
      const mockTopProducts: Record<string, unknown>[] = []

      mockPrismaQueryRaw
        .mockResolvedValueOnce(mockCounts)
        .mockResolvedValueOnce(mockMonthly)
        .mockResolvedValueOnce(mockRecentDocs)
        .mockResolvedValueOnce(mockSalesInvoices)
        .mockResolvedValueOnce(mockActivityFeed)
        .mockResolvedValueOnce(mockTopProducts)

      const result = await getDashboardStats()

      expect(result.data?.stats.clients).toBe(10)
      expect(result.data?.stats.products).toBe(100)
      expect(result.data?.stats.totalSalesAmount).toBe(50000)
      expect(result.data?.stats.paymentRate).toBe(0)
      expect(result.data?.stats.stockAvailability).toBe(98)
      expect(result.data?.monthlyData).toBeDefined()
      expect(result.data?.recentDocs).toEqual([])
      expect(result.data?.salesInvoices).toEqual([])
      expect(result.data?.activities).toEqual([])
      expect(result.data?.topProducts).toEqual([])
      expect(result.error).toBeUndefined()
      expect(mockCacheSet).toHaveBeenCalled()
    })

    it('should return { data, error } on DB error', async () => {
      mockPrismaQueryRaw.mockRejectedValue(new Error('DB error'))

      const result = await getDashboardStats()

      expect(result.data?.stats.clients).toBe(0)
      expect(result.data?.stats.products).toBe(0)
      expect(result.data?.stats.paymentRate).toBe(0)
      expect(result.data?.stats.stockAvailability).toBe(100)
      expect(result.data?.recentDocs).toEqual([])
      expect(result.data?.salesInvoices).toEqual([])
      expect(result.data?.monthlyData).toEqual([])
      expect(result.data?.activities).toEqual([])
      expect(result.data?.topProducts).toEqual([])
      expect(result.error).toBe('Failed to fetch dashboard stats')
    })
  })
})
