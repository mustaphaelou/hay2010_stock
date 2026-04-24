import { describe, it, expect } from 'vitest'
import { getPaginationParams, buildPaginationMeta, DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT, createEmptyResult } from '@/lib/pagination'

describe('Pagination Utils', () => {
  describe('getPaginationParams', () => {
    it('should use defaults when no params provided', () => {
      const result = getPaginationParams({})

      expect(result.page).toBe(1)
      expect(result.limit).toBe(100)
      expect(result.skip).toBe(0)
      expect(result.take).toBe(100)
    })

    it('should calculate skip from page and limit', () => {
      const result = getPaginationParams({ page: 3, limit: 25 })

      expect(result.skip).toBe(50)
      expect(result.take).toBe(25)
    })

    it('should clamp page to minimum of 1', () => {
      const result = getPaginationParams({ page: -5, limit: 10 })

      expect(result.page).toBe(1)
      expect(result.skip).toBe(0)
    })

    it('should clamp limit between 1 and 100', () => {
      const tooLow = getPaginationParams({ limit: 0 })
      expect(tooLow.limit).toBe(1)

      const tooHigh = getPaginationParams({ limit: 500 })
      expect(tooHigh.limit).toBe(100)
    })

    it('should use explicit undefined as default', () => {
      const result = getPaginationParams({ page: undefined, limit: undefined })

      expect(result.page).toBe(1)
      expect(result.limit).toBe(100)
    })
  })

  describe('buildPaginationMeta', () => {
    it('should compute totalPages correctly', () => {
      const meta = buildPaginationMeta(100, 1, 25)

      expect(meta.totalPages).toBe(4)
      expect(meta.hasMore).toBe(true)
    })

    it('should handle zero total', () => {
      const meta = buildPaginationMeta(0, 1, 25)

      expect(meta.totalPages).toBe(0)
      expect(meta.hasMore).toBe(false)
    })

    it('should handle last page', () => {
      const meta = buildPaginationMeta(50, 2, 25)

      expect(meta.totalPages).toBe(2)
      expect(meta.hasMore).toBe(false)
    })

    it('should handle partial last page', () => {
      const meta = buildPaginationMeta(51, 2, 25)

      expect(meta.totalPages).toBe(3)
      expect(meta.hasMore).toBe(true)
    })
  })

  describe('Constants', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_PAGE).toBe(1)
      expect(DEFAULT_LIMIT).toBe(50)
      expect(MAX_LIMIT).toBe(100)
    })
  })

  describe('createEmptyResult', () => {
    it('should create empty result without error', () => {
      const result = createEmptyResult()

      expect(result.data).toEqual([])
      expect(result.meta.total).toBe(0)
      expect(result.error).toBeUndefined()
    })

    it('should create empty result with error', () => {
      const result = createEmptyResult(1, 50, 'Something failed')

      expect(result.data).toEqual([])
      expect(result.meta.page).toBe(1)
      expect(result.error).toBe('Something failed')
    })
  })
})
