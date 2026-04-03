import { describe, it, expect, beforeEach, jest } from '@jest/globals'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    niveauStock: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    mouvementStock: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
  withTransaction: jest.fn(),
}))

jest.mock('@/lib/db/redis-cluster', () => ({
  CacheService: {
    acquireLock: jest.fn(),
    releaseLock: jest.fn(),
  },
}))

jest.mock('@/lib/cache/invalidation', () => ({
  CacheInvalidationService: {
    invalidateProduct: jest.fn(),
    invalidateStock: jest.fn(),
  },
}))

jest.mock('@/lib/auth/user-utils', () => ({
  requireRole: jest.fn().mockResolvedValue({ id: 'user-1', role: 'ADMIN' }),
}))

jest.mock('@/lib/security/csrf', () => ({
  requireCsrfToken: jest.fn().mockResolvedValue(undefined),
}))

const { prisma } = require('@/lib/db/prisma')
const { CacheService } = require('@/lib/db/redis-cluster')

describe('Stock Movement Actions', () => {
  const validInput = {
    productId: 1,
    warehouseId: 1,
    quantity: 10,
    type: 'ENTREE' as const,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createStockMovement', () => {
    it('should reject negative quantity', async () => {
      const { createStockMovement } = await import('@/app/actions/stock-movement')
      const result = await createStockMovement({
        ...validInput,
        quantity: -5,
      }, 'valid-csrf-token')

      expect(result.error).toContain('positive')
    })

    it('should reject transfer without destination warehouse', async () => {
      const { createStockMovement } = await import('@/app/actions/stock-movement')
      const result = await createStockMovement({
        ...validInput,
        type: 'TRANSFERT',
      }, 'valid-csrf-token')

      expect(result.error).toContain('Destination warehouse required')
    })

    it('should reject if lock acquisition fails', async () => {
      CacheService.acquireLock.mockResolvedValue(null)

      const { createStockMovement } = await import('@/app/actions/stock-movement')
      const result = await createStockMovement(validInput, 'valid-csrf-token')

      expect(result.error).toContain('Stock operation in progress')
    })
  })

  describe('getStockMovements', () => {
    it('should fetch movements with default limit', async () => {
      const mockMovements = [
        {
          id_mouvement: 1,
          id_produit: 1,
          id_entrepot: 1,
          type_mouvement: 'ENTREE',
          quantite: 10,
          date_mouvement: new Date(),
          produit: { code_produit: 'P001', nom_produit: 'Product 1' },
          entrepot: { nom_entrepot: 'Warehouse 1' },
        },
      ]

      prisma.prisma.mouvementStock.findMany.mockResolvedValue(mockMovements)

      const { getStockMovements } = await import('@/app/actions/stock-movement')
      const result = await getStockMovements()

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
    })

    it('should cap limit at 500', async () => {
      prisma.prisma.mouvementStock.findMany.mockResolvedValue([])

      const { getStockMovements } = await import('@/app/actions/stock-movement')
      await getStockMovements(undefined, undefined, 600)

      expect(prisma.prisma.mouvementStock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 500,
        })
      )
    })
  })
})
