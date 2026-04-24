import { describe, it, expect } from 'vitest'
import { Result, tryAsync, trySync } from '@/lib/result'

describe('Result Monad', () => {
  describe('Result.ok', () => {
    it('should create a success result', () => {
      const result = Result.ok(42)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(42)
      }
    })
  })

  describe('Result.err', () => {
    it('should create a failure result', () => {
      const result = Result.err(new Error('fail'))

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe('fail')
      }
    })
  })

  describe('Result.isOk', () => {
    it('should return true for success', () => {
      expect(Result.isOk(Result.ok(1))).toBe(true)
    })

    it('should return false for failure', () => {
      expect(Result.isOk(Result.err(new Error()))).toBe(false)
    })
  })

  describe('Result.isErr', () => {
    it('should return true for failure', () => {
      expect(Result.isErr(Result.err(new Error()))).toBe(true)
    })

    it('should return false for success', () => {
      expect(Result.isErr(Result.ok(1))).toBe(false)
    })
  })

  describe('Result.map', () => {
    it('should transform success data', () => {
      const result = Result.map(Result.ok(5), (x) => x * 2)

      expect(Result.isOk(result) && result.data).toBe(10)
    })

    it('should pass through failure', () => {
      const err = Result.err(new Error('no'))
      const result = Result.map(err, (x: number) => x * 2)

      expect(Result.isErr(result)).toBe(true)
    })
  })

  describe('Result.flatMap', () => {
    it('should chain success results', () => {
      const result = Result.flatMap(Result.ok(5), (x) => Result.ok(x + 3))

      expect(Result.isOk(result) && result.data).toBe(8)
    })

    it('should allow chaining into failure', () => {
      const result = Result.flatMap(Result.ok(5), () => Result.err(new Error('chained fail')))

      expect(Result.isErr(result)).toBe(true)
    })

    it('should pass through failure', () => {
      const result = Result.flatMap(Result.err(new Error('no')), (x: number) => Result.ok(x + 3))

      expect(Result.isErr(result)).toBe(true)
    })
  })

  describe('Result.unwrapOr', () => {
    it('should return data for success', () => {
      expect(Result.unwrapOr(Result.ok(42), 0)).toBe(42)
    })

    it('should return default for failure', () => {
      expect(Result.unwrapOr(Result.err(new Error('fail')), 0)).toBe(0)
    })
  })

  describe('Result.unwrapOrElse', () => {
    it('should return data for success', () => {
      expect(Result.unwrapOrElse(Result.ok(42), () => 0)).toBe(42)
    })

    it('should call function for failure', () => {
      const result = Result.unwrapOrElse(Result.err(new Error('fail')), (e) => e.message)
      expect(result).toBe('fail')
    })
  })

  describe('tryAsync', () => {
    it('should wrap successful async call', async () => {
      const result = await tryAsync(() => Promise.resolve(10))

      expect(Result.isOk(result) && result.data).toBe(10)
    })

    it('should wrap failed async call', async () => {
      const result = await tryAsync(() => Promise.reject(new Error('async fail')))

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error.message).toBe('async fail')
      }
    })

    it('should wrap non-Error rejection', async () => {
      const result = await tryAsync(() => Promise.reject('string error'))

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error.message).toBe('string error')
      }
    })
  })

  describe('trySync', () => {
    it('should wrap successful sync call', () => {
      const result = trySync(() => JSON.parse('{"a":1}'))

      expect(Result.isOk(result) && result.data).toEqual({ a: 1 })
    })

    it('should wrap thrown error', () => {
      const result = trySync(() => {
        throw new Error('sync fail')
      })

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error.message).toBe('sync fail')
      }
    })

    it('should wrap non-Error thrown value', () => {
      const result = trySync(() => {
        throw 'thrown string'
      })

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error.message).toBe('thrown string')
      }
    })
  })
})
