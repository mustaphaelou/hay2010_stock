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
          ruptures: BigInt(1),
        }])
        .mockResolvedValueOnce([{ month: 'Jan 26', ventes: 1000, achats: 500 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
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
          ruptures: BigInt(0),
        }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { id: '1', type: 'document', title: 'FACT-001', description: null, timestamp: new Date() },
          { id: '2', type: 'stock_movement', title: 'BL-001', description: null, timestamp: new Date() },
        ])
        .mockResolvedValueOnce([
          { id_produit: 1, nom_produit: 'Product A', nom_categorie: 'Cat A', total_quantity: 10, total_revenue: 5000, stock_level: 50 },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])

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
          ruptures: BigInt(0),
        }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])

      const result = await getDashboardStats()

      expect(result.data?.stats.paymentRate).toBe(25)
      expect(result.data?.stats.unpaidCount).toBe(2)
      expect(result.data?.stats.unpaidTotal).toBe(2500)
    })

    it('should include rupturesCount, lowStockItems, todaysMovements in dashboard data', async () => {
      mockDocVenteFindMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])

      mockPrismaQueryRaw
        .mockResolvedValueOnce([{
          clients: BigInt(1), suppliers: BigInt(1), products: BigInt(1),
          families: BigInt(1), sales: BigInt(1), purchases: BigInt(1),
          low_stock: BigInt(3), total_stock_products: BigInt(10),
          total_sales_amount: 1000, total_purchases_amount: 500,
          ruptures: BigInt(2),
        }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])

      const result = await getDashboardStats()

      expect(result.data?.stats.rupturesCount).toBe(2)
      expect(Array.isArray(result.data?.lowStockItems)).toBe(true)
      expect(Array.isArray(result.data?.todaysMovements)).toBe(true)
    })

    it('should distinguish rupture (stock = 0) from bas (stock > 0 and <= reorder level) in lowStockItems', async () => {
      mockDocVenteFindMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])

      mockPrismaQueryRaw
        .mockResolvedValueOnce([{
          clients: BigInt(0), suppliers: BigInt(0), products: BigInt(0),
          families: BigInt(0), sales: BigInt(0), purchases: BigInt(0),
          low_stock: BigInt(2), total_stock_products: BigInt(2),
          total_sales_amount: 0, total_purchases_amount: 0,
          ruptures: BigInt(1),
        }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { id_produit: 10, code_produit: 'A-001', nom_produit: 'Vis M6', id_entrepot: 1, nom_entrepot: 'Principal', quantite_en_stock: 0, niveau_reappro_quantite: 5, status: 'rupture' },
          { id_produit: 11, code_produit: 'A-002', nom_produit: 'Boulon', id_entrepot: 1, nom_entrepot: 'Principal', quantite_en_stock: 3, niveau_reappro_quantite: 10, status: 'bas' },
        ])
        .mockResolvedValueOnce([])

      const result = await getDashboardStats()

      expect(result.data?.lowStockItems).toHaveLength(2)
      const rupture = result.data?.lowStockItems.find((i) => i.code_produit === 'A-001')
      const bas = result.data?.lowStockItems.find((i) => i.code_produit === 'A-002')
      expect(rupture?.status).toBe('rupture')
      expect(rupture?.quantite_en_stock).toBe(0)
      expect(bas?.status).toBe('bas')
      expect(bas?.quantite_en_stock).toBe(3)
      expect(bas?.niveau_reappro_quantite).toBe(10)
    })

    it('should preserve low-stock ordering with rupture before bas', async () => {
      mockDocVenteFindMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])

      mockPrismaQueryRaw
        .mockResolvedValueOnce([{
          clients: BigInt(0), suppliers: BigInt(0), products: BigInt(0),
          families: BigInt(0), sales: BigInt(0), purchases: BigInt(0),
          low_stock: BigInt(3), total_stock_products: BigInt(3),
          total_sales_amount: 0, total_purchases_amount: 0,
          ruptures: BigInt(2),
        }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { id_produit: 20, code_produit: 'R-001', nom_produit: 'Rupture A', id_entrepot: 1, nom_entrepot: 'Principal', quantite_en_stock: 0, niveau_reappro_quantite: 5, status: 'rupture' },
          { id_produit: 21, code_produit: 'R-002', nom_produit: 'Rupture B', id_entrepot: 1, nom_entrepot: 'Principal', quantite_en_stock: 0, niveau_reappro_quantite: 8, status: 'rupture' },
          { id_produit: 22, code_produit: 'B-001', nom_produit: 'Bas A', id_entrepot: 1, nom_entrepot: 'Principal', quantite_en_stock: 4, niveau_reappro_quantite: 10, status: 'bas' },
        ])
        .mockResolvedValueOnce([])

      const result = await getDashboardStats()

      const statuses = result.data?.lowStockItems.map((i) => i.status)
      expect(statuses).toEqual(['rupture', 'rupture', 'bas'])
    })

    it("should query today's movements with a server-local start-of-day cutoff", async () => {
      mockDocVenteFindMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])

      mockPrismaQueryRaw
        .mockResolvedValueOnce([{
          clients: BigInt(0), suppliers: BigInt(0), products: BigInt(0),
          families: BigInt(0), sales: BigInt(0), purchases: BigInt(0),
          low_stock: BigInt(0), total_stock_products: BigInt(0),
          total_sales_amount: 0, total_purchases_amount: 0,
          ruptures: BigInt(0),
        }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])

      const before = new Date()
      const expectedStart = new Date(before.getFullYear(), before.getMonth(), before.getDate(), 0, 0, 0, 0)

      await getDashboardStats()

      const todaysMovementsCall = mockPrismaQueryRaw.mock.calls[5]
      expect(todaysMovementsCall).toBeDefined()
      const cutoffArg = todaysMovementsCall[1]
      expect(cutoffArg).toBeInstanceOf(Date)
      const cutoff = cutoffArg as Date
      expect(cutoff.getHours()).toBe(0)
      expect(cutoff.getMinutes()).toBe(0)
      expect(cutoff.getSeconds()).toBe(0)
      expect(cutoff.getMilliseconds()).toBe(0)
      expect(cutoff.getFullYear()).toBe(expectedStart.getFullYear())
      expect(cutoff.getMonth()).toBe(expectedStart.getMonth())
      expect(cutoff.getDate()).toBe(expectedStart.getDate())
    })
  })
})
