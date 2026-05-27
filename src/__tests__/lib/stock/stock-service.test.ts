import { describe, it, expect, beforeEach, vi } from 'vitest'

const { mockCacheInvalidateStock } = vi.hoisted(() => ({
  mockCacheInvalidateStock: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    produit: { findUnique: vi.fn() },
    entrepot: { findUnique: vi.fn() },
    niveauStock: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    mouvementStock: { create: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn(),
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
    invalidateStock: mockCacheInvalidateStock,
    invalidateProduct: vi.fn(),
  },
}))

vi.mock('@/lib/cache/versioned', () => ({
  VersionedCacheService: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn(),
  },
  CacheNamespaces: { PRODUCT: 'product', STOCK: 'stock' },
  CacheTTLSeconds: { PRODUCT: 300, STOCK: 600 },
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

import { createStockLevel, adjustStockLevel, deleteStockLevel } from '@/lib/stock/stock-service'
import { prisma, withTransaction } from '@/lib/db/prisma'
import { CacheService } from '@/lib/db/redis'

describe('createStockLevel', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('should create stock level with valid product and warehouse', async () => {
    ;(prisma.produit.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id_produit: 1 })
    ;(prisma.entrepot.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id_entrepot: 2 })
    ;(prisma.niveauStock.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id_stock: 10,
      id_produit: 1,
      id_entrepot: 2,
      quantite_en_stock: 0,
      quantite_reservee: 0,
      quantite_commandee: 0,
    })

    const result = await createStockLevel({ productId: 1, warehouseId: 2 }, 'user-1')

    expect(result.error).toBeUndefined()
    expect(result.data).toEqual({
      id_stock: 10,
      id_produit: 1,
      id_entrepot: 2,
      quantite_en_stock: 0,
      quantite_reservee: 0,
      quantite_commandee: 0,
    })
    expect(prisma.niveauStock.create).toHaveBeenCalled()
  })

  it('should reject duplicate composite key', async () => {
    ;(prisma.produit.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id_produit: 1 })
    ;(prisma.entrepot.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id_entrepot: 2 })
    ;(prisma.niveauStock.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id_stock: 5 })

    const result = await createStockLevel({ productId: 1, warehouseId: 2 }, 'user-1')

    expect(result.error).toContain('existe déjà')
    expect(result.data).toBeUndefined()
    expect(prisma.niveauStock.create).not.toHaveBeenCalled()
  })

  it('should reject invalid product FK', async () => {
    ;(prisma.produit.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const result = await createStockLevel({ productId: 999, warehouseId: 2 }, 'user-1')

    expect(result.error).toContain('introuvable')
  })

  it('should reject invalid warehouse FK', async () => {
    ;(prisma.produit.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id_produit: 1 })
    ;(prisma.entrepot.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const result = await createStockLevel({ productId: 1, warehouseId: 999 }, 'user-1')

    expect(result.error).toContain('introuvable')
  })

  it('should create initial audit movement when quantity > 0', async () => {
    ;(prisma.produit.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id_produit: 1 })
    ;(prisma.entrepot.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id_entrepot: 2 })
    ;(prisma.niveauStock.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id_stock: 10,
      id_produit: 1,
      id_entrepot: 2,
      quantite_en_stock: 50,
      quantite_reservee: 0,
      quantite_commandee: 0,
    })
    ;(withTransaction as ReturnType<typeof vi.fn>).mockImplementation(
      (fn: (tx: typeof prisma) => unknown) => fn(prisma)
    )

    const result = await createStockLevel(
      { productId: 1, warehouseId: 2, quantite_en_stock: 50 },
      'user-1'
    )

    expect(result.error).toBeUndefined()
    expect(prisma.mouvementStock.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id_produit: 1,
        id_entrepot: 2,
        type_mouvement: 'INVENTAIRE',
        quantite: 50,
      }),
    })
  })
})

describe('adjustStockLevel', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('should increase stock when delta > 0 and create two INVENTAIRE movements', async () => {
    (CacheService.acquireLock as ReturnType<typeof vi.fn>).mockResolvedValue('lock-token')
    ;(prisma.niveauStock.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id_stock: 10,
      id_produit: 1,
      id_entrepot: 2,
      quantite_en_stock: 20,
      quantite_reservee: 0,
      quantite_commandee: 0,
    })
    ;(prisma.mouvementStock.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id_mouvement: 100 })
    ;(prisma.niveauStock.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id_stock: 10,
      id_produit: 1,
      id_entrepot: 2,
      quantite_en_stock: 50,
    })
    ;(withTransaction as ReturnType<typeof vi.fn>).mockImplementation(
      (fn: (tx: typeof prisma) => unknown) => fn(prisma)
    )

    const result = await adjustStockLevel(
      { productId: 1, warehouseId: 2, newQuantity: 50 },
      'user-1'
    )

    expect(result.error).toBeUndefined()
    expect(result.data).toEqual({
      previousQuantity: 20,
      newQuantity: 50,
      delta: 30,
    })
    expect(prisma.mouvementStock.create).toHaveBeenCalledTimes(2)
    expect(prisma.niveauStock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_stock: 10 },
        data: expect.objectContaining({
          quantite_en_stock: 50,
          type_dernier_mouvement: 'INVENTAIRE',
        }),
      })
    )
    expect(CacheService.releaseLock).toHaveBeenCalled()
  })

  it('should decrease stock when delta < 0 and create two INVENTAIRE movements', async () => {
    (CacheService.acquireLock as ReturnType<typeof vi.fn>).mockResolvedValue('lock-token')
    ;(prisma.niveauStock.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id_stock: 10,
      id_produit: 1,
      id_entrepot: 2,
      quantite_en_stock: 50,
      quantite_reservee: 0,
      quantite_commandee: 0,
    })
    ;(prisma.mouvementStock.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id_mouvement: 100 })
    ;(prisma.niveauStock.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id_stock: 10,
      quantite_en_stock: 20,
    })
    ;(withTransaction as ReturnType<typeof vi.fn>).mockImplementation(
      (fn: (tx: typeof prisma) => unknown) => fn(prisma)
    )

    const result = await adjustStockLevel(
      { productId: 1, warehouseId: 2, newQuantity: 20 },
      'user-1'
    )

    expect(result.error).toBeUndefined()
    expect(result.data).toEqual({
      previousQuantity: 50,
      newQuantity: 20,
      delta: -30,
    })
    expect(prisma.mouvementStock.create).toHaveBeenCalledTimes(2)
  })

  it('should be idempotent when delta is 0', async () => {
    (CacheService.acquireLock as ReturnType<typeof vi.fn>).mockResolvedValue('lock-token')
    ;(prisma.niveauStock.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id_stock: 10,
      id_produit: 1,
      id_entrepot: 2,
      quantite_en_stock: 30,
    })
    ;(withTransaction as ReturnType<typeof vi.fn>).mockImplementation(
      (fn: (tx: typeof prisma) => unknown) => fn(prisma)
    )

    const result = await adjustStockLevel(
      { productId: 1, warehouseId: 2, newQuantity: 30 },
      'user-1'
    )

    expect(result.error).toBeUndefined()
    expect(result.data).toEqual({
      previousQuantity: 30,
      newQuantity: 30,
      delta: 0,
    })
    expect(prisma.mouvementStock.create).not.toHaveBeenCalled()
    expect(prisma.niveauStock.update).not.toHaveBeenCalled()
  })

  it('should find-or-create NiveauStock when missing', async () => {
    (CacheService.acquireLock as ReturnType<typeof vi.fn>).mockResolvedValue('lock-token')
    ;(prisma.niveauStock.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    ;(prisma.niveauStock.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id_stock: 20,
      id_produit: 1,
      id_entrepot: 2,
      quantite_en_stock: 0,
    })
    ;(prisma.mouvementStock.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id_mouvement: 100 })
    ;(prisma.niveauStock.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id_stock: 20,
      quantite_en_stock: 25,
    })
    ;(withTransaction as ReturnType<typeof vi.fn>).mockImplementation(
      (fn: (tx: typeof prisma) => unknown) => fn(prisma)
    )

    const result = await adjustStockLevel(
      { productId: 1, warehouseId: 2, newQuantity: 25 },
      'user-1'
    )

    expect(result.error).toBeUndefined()
    expect(prisma.niveauStock.create).toHaveBeenCalledWith({
      data: {
        id_produit: 1,
        id_entrepot: 2,
        quantite_en_stock: 0,
        quantite_reservee: 0,
        quantite_commandee: 0,
      },
    })
    expect(result.data).toEqual({
      previousQuantity: 0,
      newQuantity: 25,
      delta: 25,
    })
  })

  it('should reject negative newQuantity', async () => {

    const result = await adjustStockLevel(
      { productId: 1, warehouseId: 2, newQuantity: -5 },
      'user-1'
    )

    expect(result.error).toBeDefined()
  })

  it('should return error on lock contention', async () => {
    (CacheService.acquireLock as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const result = await adjustStockLevel(
      { productId: 1, warehouseId: 2, newQuantity: 10 },
      'user-1'
    )

    expect(result.error).toContain('progress')
  })
})

describe('deleteStockLevel', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('should delete stock level when quantity is 0', async () => {
    ;(prisma.niveauStock.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id_stock: 10,
      id_produit: 1,
      id_entrepot: 2,
      quantite_en_stock: 0,
    })
    ;(prisma.niveauStock.delete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

    const result = await deleteStockLevel(10)

    expect(result.error).toBeUndefined()
    expect(prisma.niveauStock.delete).toHaveBeenCalledWith({
      where: { id_stock: 10 },
    })
  })

  it('should reject deletion when quantity is not 0', async () => {
    ;(prisma.niveauStock.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id_stock: 10,
      id_produit: 1,
      id_entrepot: 2,
      quantite_en_stock: 50,
    })

    const result = await deleteStockLevel(10)

    expect(result.error).toBeDefined()
    expect(prisma.niveauStock.delete).not.toHaveBeenCalled()
  })

  it('should return error when stock level not found', async () => {
    ;(prisma.niveauStock.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const result = await deleteStockLevel(999)

    expect(result.error).toContain('introuvable')
    expect(prisma.niveauStock.delete).not.toHaveBeenCalled()
  })
})
