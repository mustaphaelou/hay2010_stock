import { describe, it, expect } from 'vitest'
import {
  toggleArticleStatusSchema,
  createStockLevelSchema,
  adjustStockLevelSchema,
  deleteStockLevelSchema,
} from '@/lib/stock/validation'

describe('toggleArticleStatusSchema', () => {
  describe('success cases', () => {
    it('should validate valid product ID and status', () => {
      const result = toggleArticleStatusSchema.safeParse({
        id_produit: 1,
        newStatus: true,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id_produit).toBe(1)
        expect(result.data.newStatus).toBe(true)
      }
    })

    it('should accept large positive integer', () => {
      const result = toggleArticleStatusSchema.safeParse({
        id_produit: 999999,
        newStatus: false,
      })
      expect(result.success).toBe(true)
    })

    it('should accept false as newStatus', () => {
      const result = toggleArticleStatusSchema.safeParse({
        id_produit: 5,
        newStatus: false,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.newStatus).toBe(false)
      }
    })
  })

  describe('failure cases', () => {
    it('should reject zero as product ID', () => {
      const result = toggleArticleStatusSchema.safeParse({
        id_produit: 0,
        newStatus: true,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Product ID must be a positive integer')
      }
    })

    it('should reject negative product ID', () => {
      const result = toggleArticleStatusSchema.safeParse({
        id_produit: -1,
        newStatus: true,
      })
      expect(result.success).toBe(false)
    })

    it('should reject non-integer product ID', () => {
      const result = toggleArticleStatusSchema.safeParse({
        id_produit: 1.5,
        newStatus: true,
      })
      expect(result.success).toBe(false)
    })

    it('should reject string as product ID', () => {
      const result = toggleArticleStatusSchema.safeParse({
        id_produit: '1',
        newStatus: true,
      })
      expect(result.success).toBe(false)
    })

    it('should reject missing newStatus', () => {
      const result = toggleArticleStatusSchema.safeParse({
        id_produit: 1,
      })
      expect(result.success).toBe(false)
    })

    it('should reject non-boolean newStatus', () => {
      const result = toggleArticleStatusSchema.safeParse({
        id_produit: 1,
        newStatus: 'true',
      })
      expect(result.success).toBe(false)
    })
  })
})

describe('createStockLevelSchema', () => {
  it('should validate with required fields', () => {
    const result = createStockLevelSchema.safeParse({
      productId: 1,
      warehouseId: 2,
    })
    expect(result.success).toBe(true)
  })

  it('should validate with optional quantite_en_stock', () => {
    const result = createStockLevelSchema.safeParse({
      productId: 1,
      warehouseId: 2,
      quantite_en_stock: 100,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.quantite_en_stock).toBe(100)
    }
  })

  it('should default optional fields to 0', () => {
    const result = createStockLevelSchema.safeParse({
      productId: 1,
      warehouseId: 2,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.quantite_en_stock).toBe(0)
      expect(result.data.quantite_reservee).toBe(0)
      expect(result.data.quantite_commandee).toBe(0)
    }
  })

  it('should reject negative quantite_en_stock', () => {
    const result = createStockLevelSchema.safeParse({
      productId: 1,
      warehouseId: 2,
      quantite_en_stock: -5,
    })
    expect(result.success).toBe(false)
  })

  it('should reject missing productId', () => {
    const result = createStockLevelSchema.safeParse({
      warehouseId: 2,
    })
    expect(result.success).toBe(false)
  })

  it('should reject missing warehouseId', () => {
    const result = createStockLevelSchema.safeParse({
      productId: 1,
    })
    expect(result.success).toBe(false)
  })
})

describe('adjustStockLevelSchema', () => {
  it('should validate with required fields', () => {
    const result = adjustStockLevelSchema.safeParse({
      productId: 1,
      warehouseId: 2,
      newQuantity: 50,
    })
    expect(result.success).toBe(true)
  })

  it('should validate with optional motif', () => {
    const result = adjustStockLevelSchema.safeParse({
      productId: 1,
      warehouseId: 2,
      newQuantity: 50,
      motif: 'Correction comptage',
    })
    expect(result.success).toBe(true)
  })

  it('should accept zero newQuantity', () => {
    const result = adjustStockLevelSchema.safeParse({
      productId: 1,
      warehouseId: 2,
      newQuantity: 0,
    })
    expect(result.success).toBe(true)
  })

  it('should reject negative newQuantity', () => {
    const result = adjustStockLevelSchema.safeParse({
      productId: 1,
      warehouseId: 2,
      newQuantity: -1,
    })
    expect(result.success).toBe(false)
  })
})

describe('deleteStockLevelSchema', () => {
  it('should validate with valid id', () => {
    const result = deleteStockLevelSchema.safeParse({ id: 1 })
    expect(result.success).toBe(true)
  })

  it('should reject zero id', () => {
    const result = deleteStockLevelSchema.safeParse({ id: 0 })
    expect(result.success).toBe(false)
  })

  it('should reject negative id', () => {
    const result = deleteStockLevelSchema.safeParse({ id: -1 })
    expect(result.success).toBe(false)
  })
})
