import { describe, it, expect } from 'vitest'
import { getDocLinesSchema } from '@/lib/documents/validation'

describe('getDocLinesSchema', () => {
  describe('success cases', () => {
    it('should validate valid document ID', () => {
      const result = getDocLinesSchema.safeParse({
        docId: 1,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.docId).toBe(1)
      }
    })

    it('should accept large positive integer', () => {
      const result = getDocLinesSchema.safeParse({
        docId: 999999,
      })
      expect(result.success).toBe(true)
    })
  })

  describe('failure cases', () => {
    it('should reject zero as document ID', () => {
      const result = getDocLinesSchema.safeParse({
        docId: 0,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Document ID must be a positive integer')
      }
    })

    it('should reject negative document ID', () => {
      const result = getDocLinesSchema.safeParse({
        docId: -5,
      })
      expect(result.success).toBe(false)
    })

    it('should reject non-integer document ID', () => {
      const result = getDocLinesSchema.safeParse({
        docId: 1.5,
      })
      expect(result.success).toBe(false)
    })

    it('should reject string document ID', () => {
      const result = getDocLinesSchema.safeParse({
        docId: '123',
      })
      expect(result.success).toBe(false)
    })

    it('should reject missing document ID', () => {
      const result = getDocLinesSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })
})
