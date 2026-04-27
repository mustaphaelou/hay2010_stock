import { describe, it, expect } from 'vitest'
import { toggleArticleStatusSchema } from '@/lib/stock/validation'

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
