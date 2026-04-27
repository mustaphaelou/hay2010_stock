import { describe, it, expect } from 'vitest'
import { getPartnersSchema } from '@/lib/partners/validation'

describe('getPartnersSchema', () => {
  describe('success cases', () => {
    it('should validate with all valid enum values', () => {
      const enumValues = ['CLIENT', 'FOURNISSEUR', 'LES_DEUX', 'all'] as const
      enumValues.forEach(type => {
        const result = getPartnersSchema.safeParse({ type })
        expect(result.success).toBe(true)
      })
    })

    it('should accept valid pagination parameters', () => {
      const result = getPartnersSchema.safeParse({
        type: 'CLIENT',
        page: 1,
        limit: 50,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.type).toBe('CLIENT')
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(50)
      }
    })

    it('should accept limit at max value (100)', () => {
      const result = getPartnersSchema.safeParse({
        type: 'CLIENT',
        limit: 100,
      })
      expect(result.success).toBe(true)
    })

    it('should accept limit at min value (1)', () => {
      const result = getPartnersSchema.safeParse({
        type: 'CLIENT',
        limit: 1,
      })
      expect(result.success).toBe(true)
    })

    it('should accept empty object (all fields optional)', () => {
      const result = getPartnersSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should omit undefined type', () => {
      const result = getPartnersSchema.safeParse({ type: undefined })
      expect(result.success).toBe(true)
    })
  })

  describe('failure cases', () => {
    it('should reject invalid enum value', () => {
      const result = getPartnersSchema.safeParse({
        type: 'INVALID_TYPE',
      })
      expect(result.success).toBe(false)
    })

    it('should reject page less than 1', () => {
      const result = getPartnersSchema.safeParse({
        page: 0,
      })
      expect(result.success).toBe(false)
    })

    it('should reject negative page', () => {
      const result = getPartnersSchema.safeParse({
        page: -1,
      })
      expect(result.success).toBe(false)
    })

    it('should reject limit greater than 100', () => {
      const result = getPartnersSchema.safeParse({
        limit: 101,
      })
      expect(result.success).toBe(false)
    })

    it('should reject limit less than 1', () => {
      const result = getPartnersSchema.safeParse({
        limit: 0,
      })
      expect(result.success).toBe(false)
    })

    it('should reject non-integer page', () => {
      const result = getPartnersSchema.safeParse({
        page: 1.5,
      })
      expect(result.success).toBe(false)
    })

    it('should reject non-integer limit', () => {
      const result = getPartnersSchema.safeParse({
        limit: 50.5,
      })
      expect(result.success).toBe(false)
    })
  })
})
