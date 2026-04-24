import { describe, it, expect, beforeEach, vi } from 'vitest'

const { mockRequirePermission } = vi.hoisted(() => ({
  mockRequirePermission: vi.fn().mockResolvedValue({ id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' }),
}))

const { mockNiveauStockFindMany, mockNiveauStockCount, mockEntrepotFindMany } = vi.hoisted(() => ({
  mockNiveauStockFindMany: vi.fn(),
  mockNiveauStockCount: vi.fn(),
  mockEntrepotFindMany: vi.fn(),
}))

const { mockVersionedCacheGet, mockVersionedCacheSet } = vi.hoisted(() => ({
  mockVersionedCacheGet: vi.fn().mockResolvedValue(null),
  mockVersionedCacheSet: vi.fn().mockResolvedValue(true),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    niveauStock: {
      findMany: mockNiveauStockFindMany,
      count: mockNiveauStockCount,
    },
    entrepot: {
      findMany: mockEntrepotFindMany,
    },
  },
}))

vi.mock('@/lib/auth/authorization', () => ({
  requirePermission: mockRequirePermission,
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

import { getStockLevels, getDepots } from '@/app/actions/stock'

describe('Stock Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequirePermission.mockResolvedValue({ id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' })
    mockVersionedCacheGet.mockResolvedValue(null)
    mockVersionedCacheSet.mockResolvedValue(true)
  })

  describe('getStockLevels', () => {
    it('should require stock:read permission', async () => {
      mockRequirePermission.mockRejectedValue(new Error('Forbidden'))

      await expect(getStockLevels()).rejects.toThrow('Forbidden')
    })

    it('should return error for invalid pagination', async () => {
      const result = await getStockLevels(-1, 0)

      expect(result.error).toBe('Invalid pagination parameters')
      expect(result.data).toEqual([])
    })

    it('should return stock levels with computed numeric values', async () => {
      const mockStock = [{
        id_stock: 1,
        id_produit: 10,
        id_entrepot: 5,
        quantite_en_stock: 100,
        quantite_reservee: 10,
        quantite_commandee: 5,
        date_dernier_mouvement: new Date(),
        type_dernier_mouvement: 'ENTREE',
        date_creation: new Date(),
        date_modification: new Date(),
        produit: { nom_produit: 'Article A', code_produit: 'ART-001', prix_achat: 50 },
        entrepot: { nom_entrepot: 'Main Warehouse', id_entrepot: 5 },
      }]
      mockNiveauStockFindMany.mockResolvedValue(mockStock)
      mockNiveauStockCount.mockResolvedValue(1)

      const result = await getStockLevels(1, 50)

      expect(result.data).toHaveLength(1)
      expect(result.data[0].quantite_en_stock_num).toBe(100)
      expect(result.data[0].cout_moyen_pondere).toBe(50)
      expect(result.data[0].valeur_stock).toBe(5000)
      expect(result.meta.total).toBe(1)
    })

    it('should handle null produit and entrepot gracefully', async () => {
      const mockStock = [{
        id_stock: 1,
        id_produit: 10,
        id_entrepot: 5,
        quantite_en_stock: 50,
        quantite_reservee: 0,
        quantite_commandee: 0,
        date_dernier_mouvement: new Date(),
        type_dernier_mouvement: null,
        date_creation: new Date(),
        date_modification: new Date(),
        produit: null,
        entrepot: null,
      }]
      mockNiveauStockFindMany.mockResolvedValue(mockStock)
      mockNiveauStockCount.mockResolvedValue(1)

      const result = await getStockLevels()

      expect(result.data[0].produit).toBeNull()
      expect(result.data[0].entrepot).toBeNull()
      expect(result.data[0].cout_moyen_pondere).toBe(0)
      expect(result.data[0].valeur_stock).toBe(0)
    })

    it('should return error on DB failure', async () => {
      mockNiveauStockFindMany.mockRejectedValue(new Error('DB error'))

      const result = await getStockLevels()

      expect(result.data).toEqual([])
      expect(result.error).toBe('Failed to fetch stock levels')
    })
  })

  describe('getDepots', () => {
    it('should require stock:read permission', async () => {
      mockRequirePermission.mockRejectedValue(new Error('Forbidden'))

      await expect(getDepots()).rejects.toThrow('Forbidden')
    })

    it('should return cached depots when available', async () => {
      const cached = [{ id_depot: 1, nom_depot: 'Cached Depot', id_entrepot: 1, nom_entrepot: 'Cached Depot', est_actif: true }]
      mockVersionedCacheGet.mockResolvedValue(cached)

      const result = await getDepots()

      expect(result).toEqual(cached)
      expect(mockEntrepotFindMany).not.toHaveBeenCalled()
    })

    it('should fetch and map depots from DB', async () => {
      mockEntrepotFindMany.mockResolvedValue([
        { id_entrepot: 1, nom_entrepot: 'Main Warehouse', est_actif: true },
        { id_entrepot: 2, nom_entrepot: 'Secondary', est_actif: true },
      ])

      const result = await getDepots()

      expect(result).toHaveLength(2)
      expect(result[0].id_depot).toBe(1)
      expect(result[0].nom_depot).toBe('Main Warehouse')
      expect(mockVersionedCacheSet).toHaveBeenCalled()
    })

    it('should return empty array on DB error', async () => {
      mockEntrepotFindMany.mockRejectedValue(new Error('DB error'))

      const result = await getDepots()

      expect(result).toEqual([])
    })
  })
})
