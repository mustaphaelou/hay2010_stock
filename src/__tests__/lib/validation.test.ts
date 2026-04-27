import { describe, it, expect } from 'vitest'
import { paginationSchema } from '@/lib/validation'

describe('paginationSchema', () => {
  describe('success cases', () => {
    it('should apply default values when not provided', () => {
      const result = paginationSchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(50)
      }
    })

    it('should accept valid page and limit', () => {
      const result = paginationSchema.safeParse({
        page: 2,
        limit: 25,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(2)
        expect(result.data.limit).toBe(25)
      }
    })

    it('should accept page at minimum value (1)', () => {
      const result = paginationSchema.safeParse({
        page: 1,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
      }
    })

    it('should accept limit at minimum value (1)', () => {
      const result = paginationSchema.safeParse({
        limit: 1,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(1)
      }
    })

    it('should accept limit at maximum value (100)', () => {
      const result = paginationSchema.safeParse({
        limit: 100,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(100)
      }
    })

    it('should apply default for missing page', () => {
      const result = paginationSchema.safeParse({
        limit: 25,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(25)
      }
    })

    it('should apply default for missing limit', () => {
      const result = paginationSchema.safeParse({
        page: 5,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(5)
        expect(result.data.limit).toBe(50)
      }
    })
  })

  describe('failure cases', () => {
    it('should reject page less than 1', () => {
      const result = paginationSchema.safeParse({
        page: 0,
      })
      expect(result.success).toBe(false)
    })

    it('should reject negative page', () => {
      const result = paginationSchema.safeParse({
        page: -5,
      })
      expect(result.success).toBe(false)
    })

    it('should reject limit greater than 100', () => {
      const result = paginationSchema.safeParse({
        limit: 101,
      })
      expect(result.success).toBe(false)
    })

    it('should reject limit less than 1', () => {
      const result = paginationSchema.safeParse({
        limit: 0,
      })
      expect(result.success).toBe(false)
    })

    it('should reject negative limit', () => {
      const result = paginationSchema.safeParse({
        limit: -10,
      })
      expect(result.success).toBe(false)
    })

    it('should reject non-integer page', () => {
      const result = paginationSchema.safeParse({
        page: 2.5,
      })
      expect(result.success).toBe(false)
    })

    it('should reject non-integer limit', () => {
      const result = paginationSchema.safeParse({
        limit: 25.5,
      })
      expect(result.success).toBe(false)
    })

    it('should reject string page', () => {
      const result = paginationSchema.safeParse({
        page: '2',
      })
      expect(result.success).toBe(false)
    })

    it('should reject string limit', () => {
      const result = paginationSchema.safeParse({
        limit: '50',
      })
      expect(result.success).toBe(false)
    })
  })
})
