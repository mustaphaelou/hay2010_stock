import { describe, it, expect, beforeEach, vi } from 'vitest'

const { mockCacheGet, mockCacheSet } = vi.hoisted(() => ({
  mockCacheGet: vi.fn().mockResolvedValue(null),
  mockCacheSet: vi.fn().mockResolvedValue(true),
}))

const { mockPrismaQueryRaw, mockDocVenteFindMany } = vi.hoisted(() => ({
  mockPrismaQueryRaw: vi.fn(),
  mockDocVenteFindMany: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $queryRaw: mockPrismaQueryRaw,
    docVente: {
      findMany: mockDocVenteFindMany,
    },
  },
}))

vi.mock('@/lib/auth/user-utils', () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' }),
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

import { getDashboardStats } from '@/lib/dashboard/dashboard-service'

describe('Dashboard Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCacheGet.mockResolvedValue(null)
    mockCacheSet.mockResolvedValue(true)
  })

  describe('getDashboardStats', () => {
    it('should include paymentRate, stockAvailability, unpaidCount, unpaidTotal in stats', async () => {
      mockDocVenteFindMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { montant_ttc: 1000, solde_du: 0, date_document: new Date(), montant_ht: 800, montant_remise_total: 0, montant_tva_total: 200 },
        ])

      mockPrismaQueryRaw
        .mockResolvedValueOnce([{
          clients: BigInt(10), suppliers: BigInt(5), products: BigInt(100),
          families: BigInt(10), sales: BigInt(50), purchases: BigInt(30),
          low_stock: BigInt(2), total_stock_products: BigInt(80),
          total_sales_amount: 50000, total_purchases_amount: 20000,
        }])
        .mockResolvedValueOnce([{ month: 'Jan 26', ventes: 1000, achats: 500 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])

      const result = await getDashboardStats()

      expect(result.data?.stats.paymentRate).toBeTypeOf('number')
      expect(result.data?.stats.stockAvailability).toBeTypeOf('number')
      expect(result.data?.stats.unpaidCount).toBeTypeOf('number')
      expect(result.data?.stats.unpaidTotal).toBeTypeOf('number')
    })

    it('should include activities and topProducts arrays in data', async () => {
      mockDocVenteFindMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])

      mockPrismaQueryRaw
        .mockResolvedValueOnce([{
          clients: BigInt(1), suppliers: BigInt(1), products: BigInt(1),
          families: BigInt(1), sales: BigInt(1), purchases: BigInt(1),
          low_stock: BigInt(0), total_stock_products: BigInt(1),
          total_sales_amount: 1000, total_purchases_amount: 500,
        }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { id: '1', type: 'document', title: 'FACT-001', description: null, timestamp: new Date() },
          { id: '2', type: 'stock_movement', title: 'BL-001', description: null, timestamp: new Date() },
        ])
        .mockResolvedValueOnce([
          { id_produit: 1, nom_produit: 'Product A', nom_categorie: 'Cat A', total_quantity: 10, total_revenue: 5000, stock_level: 50 },
        ])

      const result = await getDashboardStats()

      expect(result.data?.activities).toHaveLength(2)
      expect(result.data?.activities[0].type).toBe('document')
      expect(result.data?.activities[1].type).toBe('stock_movement')
      expect(result.data?.topProducts).toHaveLength(1)
      expect(result.data?.topProducts[0].name).toBe('Product A')
      expect(result.data?.topProducts[0].category).toBe('Cat A')
      expect(result.data?.topProducts[0].trend).toBe(0)
      expect(result.data?.topProducts[0].trendDirection).toBe('neutral')
    })

    it('should compute payment rate from sales invoices', async () => {
      mockDocVenteFindMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { montant_ttc: 1000, solde_du: 0, date_document: new Date(), montant_ht: 800, montant_remise_total: 0, montant_tva_total: 200 },
          { montant_ttc: 2000, solde_du: 2000, date_document: new Date(), montant_ht: 1600, montant_remise_total: 0, montant_tva_total: 400 },
          { montant_ttc: 1500, solde_du: 500, date_document: new Date(), montant_ht: 1200, montant_remise_total: 0, montant_tva_total: 300 },
        ])

      mockPrismaQueryRaw
        .mockResolvedValueOnce([{
          clients: BigInt(1), suppliers: BigInt(1), products: BigInt(1),
          families: BigInt(1), sales: BigInt(4), purchases: BigInt(1),
          low_stock: BigInt(0), total_stock_products: BigInt(1),
          total_sales_amount: 10000, total_purchases_amount: 0,
        }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])

      const result = await getDashboardStats()

      expect(result.data?.stats.paymentRate).toBe(25)
      expect(result.data?.stats.unpaidCount).toBe(2)
      expect(result.data?.stats.unpaidTotal).toBe(2500)
    })
  })
})
