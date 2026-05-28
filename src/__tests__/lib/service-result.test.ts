import { describe, it, expect } from 'vitest'
import { serviceError, isServiceError } from '@/lib/service-result'
import type { ServiceErrorCode } from '@/lib/service-result'

describe('serviceError', () => {
  it('returns an object with error message and code', () => {
    const result = serviceError('Article introuvable', 'NOT_FOUND')
    expect(result).toEqual({ error: 'Article introuvable', code: 'NOT_FOUND' })
  })

  it('works with all error codes', () => {
    const codes: ServiceErrorCode[] = ['NOT_FOUND', 'CONFLICT', 'VALIDATION', 'LOCK_CONTENTION', 'INTERNAL']
    const messages = ['Not found', 'Conflict', 'Invalid', 'Locked', 'Error']
    for (let i = 0; i < codes.length; i++) {
      const result = serviceError(messages[i], codes[i])
      expect(result.error).toBe(messages[i])
      expect(result.code).toBe(codes[i])
    }
  })
})

describe('isServiceError', () => {
  it('returns true for an error result', () => {
    const result = serviceError('Something went wrong', 'INTERNAL')
    expect(isServiceError(result)).toBe(true)
  })

  it('returns false for a data result', () => {
    const result = { data: { id: 1 } }
    expect(isServiceError(result)).toBe(false)
  })

  it('returns false for an empty success result', () => {
    const result = { data: undefined }
    expect(isServiceError(result)).toBe(false)
  })
})
