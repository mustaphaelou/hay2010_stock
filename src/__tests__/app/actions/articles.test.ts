import { describe, it, expect, beforeEach, vi } from 'vitest'

const { mockRequirePermission } = vi.hoisted(() => ({
  mockRequirePermission: vi.fn().mockResolvedValue({ id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' }),
}))

const { mockProduitFindMany, mockProduitCount, mockProduitUpdate, mockPrismaTransaction, mockPrismaQueryRaw } = vi.hoisted(() => ({
  mockProduitFindMany: vi.fn(),
  mockProduitCount: vi.fn(),
  mockProduitUpdate: vi.fn(),
  mockPrismaTransaction: vi.fn(),
  mockPrismaQueryRaw: vi.fn(),
}))

const { mockVersionedCacheGet, mockVersionedCacheSet } = vi.hoisted(() => ({
  mockVersionedCacheGet: vi.fn().mockResolvedValue(null),
  mockVersionedCacheSet: vi.fn().mockResolvedValue(true),
}))

const { mockCacheServiceAcquireLock, mockCacheServiceReleaseLock } = vi.hoisted(() => ({
  mockCacheServiceAcquireLock: vi.fn().mockResolvedValue('lock-token'),
  mockCacheServiceReleaseLock: vi.fn().mockResolvedValue(undefined),
}))

const { mockExecuteStockWrite } = vi.hoisted(() => ({
  mockExecuteStockWrite: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    produit: {
      findMany: mockProduitFindMany,
      count: mockProduitCount,
      update: mockProduitUpdate,
    },
    $queryRaw: mockPrismaQueryRaw,
    $transaction: mockPrismaTransaction,
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

vi.mock('@/lib/db/redis', () => ({
  CacheService: {
    acquireLock: mockCacheServiceAcquireLock,
    releaseLock: mockCacheServiceReleaseLock,
  },
  redis: { get: vi.fn(), set: vi.fn(), setex: vi.fn(), del: vi.fn(), incr: vi.fn(), expire: vi.fn() },
  redisSession: { get: vi.fn(), set: vi.fn(), setex: vi.fn(), del: vi.fn() },
  isRedisReady: vi.fn().mockReturnValue(true),
}))

vi.mock('@/lib/stock/stock-write', () => ({
  executeStockWrite: mockExecuteStockWrite,
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

vi.mock('next/server', () => ({
  after: vi.fn((fn) => fn()),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

import { getArticlesWithStock, toggleArticleStatus } from '@/app/actions/articles'

describe('Articles Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequirePermission.mockResolvedValue({ id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' })
    mockVersionedCacheGet.mockResolvedValue(null)
    mockVersionedCacheSet.mockResolvedValue(true)
    mockCacheServiceAcquireLock.mockResolvedValue('lock-token')
    mockCacheServiceReleaseLock.mockResolvedValue(undefined)
  })

  describe('getArticlesWithStock', () => {
    it('should require stock:read permission', async () => {
      mockRequirePermission.mockRejectedValue(new Error('Forbidden'))
      mockProduitFindMany.mockResolvedValue([])
      mockProduitCount.mockResolvedValue(0)
      mockPrismaQueryRaw.mockResolvedValue([])

      await expect(getArticlesWithStock()).rejects.toThrow('Forbidden')
    })

    it('should return cached data when available', async () => {
      const cached = { data: [{ id_produit: 1, nom_produit: 'Test' }], meta: { total: 1, page: 1, limit: 50, totalPages: 1 } }
      mockVersionedCacheGet.mockResolvedValue(cached)

      const result = await getArticlesWithStock()

      expect(result).toEqual(cached)
      expect(mockProduitFindMany).not.toHaveBeenCalled()
    })

    it('should fetch articles and stock from DB when not cached', async () => {
      mockProduitFindMany.mockResolvedValue([
        {
          id_produit: 1,
          code_produit: 'ART-001',
          nom_produit: 'Test Article',
          famille: null,
          categorie: { id_categorie: 1, code_categorie: 'CAT1', nom_categorie: 'Category 1', description_categorie: 'desc', est_actif: true },
          id_categorie: 1,
          description_produit: null,
          code_barre_ean: null,
          unite_mesure: 'UNIT',
          poids_kg: null,
          volume_m3: null,
          prix_achat: 10,
          prix_dernier_achat: 10,
          coefficient: 1,
          prix_vente: 15,
          prix_gros: null,
          taux_tva: 20,
          type_suivi_stock: null,
          quantite_min_commande: null,
          niveau_reappro_quantite: null,
          stock_minimum: null,
          stock_maximum: null,
          activer_suivi_stock: true,
          id_fournisseur_principal: null,
          reference_fournisseur: null,
          delai_livraison_fournisseur_jours: null,
          est_actif: true,
          en_sommeil: false,
          est_abandonne: false,
          date_creation: new Date(),
          date_modification: new Date(),
          cree_par: null,
          modifie_par: null,
          compte_general_vente: null,
          compte_general_achat: null,
          code_taxe_vente: null,
          code_taxe_achat: null,
        },
      ])
      mockProduitCount.mockResolvedValue(1)
      mockPrismaQueryRaw.mockResolvedValue([{ id_produit: 1, stock_global: 50 }])

      const result = await getArticlesWithStock(1, 50)

      expect(result.data).toHaveLength(1)
      expect(result.data[0].stock_global).toBe(50)
      expect(result.meta.total).toBe(1)
      expect(mockVersionedCacheSet).toHaveBeenCalled()
    })

    it('should cap limit at 100', async () => {
      mockProduitFindMany.mockResolvedValue([])
      mockProduitCount.mockResolvedValue(0)
      mockPrismaQueryRaw.mockResolvedValue([])

      await getArticlesWithStock(1, 200)

      expect(mockProduitFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 })
      )
    })

    it('should return error on DB failure', async () => {
      mockProduitFindMany.mockRejectedValue(new Error('DB error'))

      const result = await getArticlesWithStock()

      expect(result.data).toEqual([])
      expect(result.error).toBe('Failed to fetch articles')
    })
  })

  describe('toggleArticleStatus', () => {
    it('should delegate to executeStockWrite with correct params', async () => {
      mockExecuteStockWrite.mockResolvedValue({ success: true })

      const result = await toggleArticleStatus(1, true, 'csrf-token')

      expect(mockExecuteStockWrite).toHaveBeenCalledWith({
        csrfToken: 'csrf-token',
        writeFn: expect.any(Function),
        invalidations: [{ kind: 'product', productId: 1 }],
        revalidatePaths: ['/articles'],
      })
      expect(result.success).toBe(true)
    })

    it('should propagate error from executeStockWrite', async () => {
      mockExecuteStockWrite.mockResolvedValue({ error: 'Jeton de sécurité invalide' })

      const result = await toggleArticleStatus(1, true, 'bad-token')

      expect(result.error).toBe('Jeton de sécurité invalide')
    })
  })
})
