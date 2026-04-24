import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prisma } from '@/lib/db/prisma'
import { CacheService } from '@/lib/db/redis'

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    niveauStock: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    mouvementStock: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
  withTransaction: vi.fn(),
}))

vi.mock('@/lib/db/redis', () => ({
  CacheService: {
    acquireLock: vi.fn(),
    releaseLock: vi.fn(),
  },
}))

vi.mock('@/lib/cache/invalidation', () => ({
  CacheInvalidationService: {
    invalidateProduct: vi.fn(),
    invalidateStock: vi.fn(),
  },
}))

vi.mock('next/server', () => ({
  after: vi.fn((fn: () => void) => fn()),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

vi.mock('@/lib/auth/authorization', () => ({
  requirePermission: vi.fn().mockResolvedValue({ id: 'user-1', role: 'ADMIN' }),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: 'mock-auth-token' }),
    set: vi.fn(),
    delete: vi.fn(),
  }),
  headers: vi.fn().mockResolvedValue(new Map()),
}))

vi.mock('@/lib/security/csrf-server', () => ({
  requireCsrfToken: vi.fn().mockResolvedValue(undefined),
  getCsrfCookie: vi.fn().mockResolvedValue('csrf-cookie-value'),
  validateCsrfToken: vi.fn().mockResolvedValue(true),
  ANONYMOUS_USER_ID: 'anonymous',
  generateCsrfToken: vi.fn().mockResolvedValue({ token: 'new-csrf-token', cookieValue: 'new-csrf-cookie' }),
  setCsrfCookie: vi.fn().mockResolvedValue(undefined),
}))

describe('Stock Movement Actions', () => {
  const validInput = {
    productId: 1,
    warehouseId: 1,
    quantity: 10,
    type: 'ENTREE' as const,
  }

  beforeEach(() => {
    vi.clearAllMocks()
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
    ;(CacheService.acquireLock as ReturnType<typeof vi.fn>).mockResolvedValue('lock-token')
    const { withTransaction } = await import('@/lib/db/prisma')
    vi.mocked(withTransaction).mockRejectedValue(new Error('Destination warehouse required'))

    const { createStockMovement } = await import('@/app/actions/stock-movement')
    const result = await createStockMovement({
      ...validInput,
      type: 'TRANSFERT',
    }, 'valid-csrf-token')

    expect(result.error).toContain('Destination warehouse required')
    })

  it('should reject if lock acquisition fails', async () => {
    ;(CacheService.acquireLock as ReturnType<typeof vi.fn>).mockResolvedValue(null)

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

      ;(prisma.mouvementStock.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockMovements)

      const { getStockMovements } = await import('@/app/actions/stock-movement')
      const result = await getStockMovements()

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
    })

    it('should cap limit at 500', async () => {
      ;(prisma.mouvementStock.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const { getStockMovements } = await import('@/app/actions/stock-movement')
      await getStockMovements(undefined, undefined, 600)

      expect(prisma.mouvementStock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 500,
        })
      )
    })
  })
})
