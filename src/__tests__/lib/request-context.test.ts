import { describe, it, expect } from 'vitest'
import { getRequestContext, setRequestContext, generateRequestId } from '@/lib/request-context'

describe('Request Context', () => {
  describe('getRequestContext', () => {
    it('should return undefined outside of context', () => {
      expect(getRequestContext()).toBeUndefined()
    })

    it('should return context inside setRequestContext', () => {
      const ctx = { requestId: 'req-1', userId: 'user-1' }

      setRequestContext(ctx, () => {
        expect(getRequestContext()).toEqual(ctx)
      })
    })
  })

  describe('setRequestContext', () => {
    it('should return the callback value', () => {
      const result = setRequestContext({ requestId: 'req-2' }, () => 42)

      expect(result).toBe(42)
    })

    it('should not leak context outside the callback', () => {
      setRequestContext({ requestId: 'req-3' }, () => {})

      expect(getRequestContext()).toBeUndefined()
    })

    it('should support nested contexts', () => {
      setRequestContext({ requestId: 'outer' }, () => {
        expect(getRequestContext()?.requestId).toBe('outer')

        setRequestContext({ requestId: 'inner', userId: 'user-2' }, () => {
          expect(getRequestContext()?.requestId).toBe('inner')
          expect(getRequestContext()?.userId).toBe('user-2')
        })

        expect(getRequestContext()?.requestId).toBe('outer')
      })
    })
  })

  describe('generateRequestId', () => {
    it('should generate unique IDs', () => {
      const ids = new Set(Array.from({ length: 100 }, generateRequestId))

      expect(ids.size).toBe(100)
    })

    it('should contain timestamp and random part', () => {
      const id = generateRequestId()

      expect(id).toMatch(/^\d+-[a-z0-9]+$/)
    })
  })
})
