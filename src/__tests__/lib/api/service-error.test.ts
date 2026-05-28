import { describe, it, expect } from 'vitest'
import { handleServiceError } from '@/lib/api/service-error'
import { NotFoundError, ConflictError, ValidationError, BusinessError } from '@/lib/errors'

function expectError(result: { error?: string; code?: string }, ErrorClass: new (...args: never[]) => Error): void {
  expect(() => handleServiceError(result)).toThrow(ErrorClass)
}

function expectNoError(result: { error?: string; code?: string }): void {
  expect(() => handleServiceError(result)).not.toThrow()
}

describe('handleServiceError', () => {
  it('does nothing when there is no error', () => {
    expectNoError({})
    expectNoError({ error: undefined })
    expectNoError({ data: 'some data' })
  })

  it('throws NotFoundError for NOT_FOUND code', () => {
    expectError({ error: 'Article introuvable', code: 'NOT_FOUND' }, NotFoundError)
  })

  it('throws ConflictError for CONFLICT code', () => {
    expectError({ error: 'existe déjà', code: 'CONFLICT' }, ConflictError)
  })

  it('throws ValidationError for VALIDATION code', () => {
    expectError({ error: 'Champ requis', code: 'VALIDATION' }, ValidationError)
  })

  it('throws ConflictError for LOCK_CONTENTION code', () => {
    expectError({ error: 'Operation in progress', code: 'LOCK_CONTENTION' }, ConflictError)
  })

  it('throws BusinessError for unrecognized code or missing code', () => {
    expectError({ error: 'Something unexpected', code: 'INTERNAL' as never }, BusinessError)
    expectError({ error: 'No code provided' }, BusinessError)
  })
})
