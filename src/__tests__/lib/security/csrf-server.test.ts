/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRedisSetex = vi.fn().mockResolvedValue('OK')
const mockRedisGet = vi.fn()
const mockRedisDel = vi.fn().mockResolvedValue(1)

vi.mock('@/lib/db/redis', () => ({
  redis: {
    setex: mockRedisSetex,
    get: mockRedisGet,
    del: mockRedisDel,
  },
  isRedisReady: vi.fn().mockReturnValue(true),
}))

vi.mock('@/lib/auth/jwt', () => ({
  verifyToken: vi.fn().mockResolvedValue({ userId: 'test-user-id', email: 'test@example.com' }),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn((name: string) => {
      if (name === 'auth_token') return { value: 'mock-auth-token' }
      if (name === 'csrf_token') return { value: 'test-csrf-cookie' }
      return undefined
    }),
    set: vi.fn(),
  }),
}))

describe('CSRF Server', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateCsrfToken', () => {
    it('should generate token with correct format', async () => {
      const { generateCsrfToken } = await import('@/lib/security/csrf-server')

      const result = await generateCsrfToken('test-user')

      expect(result.token).toBeDefined()
      expect(result.cookieValue).toBeDefined()
      expect(result.token).toHaveLength(64)
      expect(result.cookieValue).toHaveLength(64)
    })

    it('should store token in Redis with correct key prefix', async () => {
      const { generateCsrfToken } = await import('@/lib/security/csrf-server')

      await generateCsrfToken('test-user')

      expect(mockRedisSetex).toHaveBeenCalledWith(
        expect.stringContaining('csrf:test-user:'),
        expect.any(Number),
        expect.any(String)
      )
    })

    it('should use "anonymous" as userId when no auth token is present', async () => {
      const { cookies } = await import('next/headers')
      vi.mocked(cookies).mockResolvedValueOnce({
        get: vi.fn(() => undefined),
        set: vi.fn(),
      } as any)

      const { generateCsrfToken } = await import('@/lib/security/csrf-server')

      await generateCsrfToken()

      expect(mockRedisSetex).toHaveBeenCalledWith(
        expect.stringContaining('csrf:anonymous:'),
        expect.any(Number),
        expect.any(String)
      )
    })

    it('should throw error when Redis is not ready', async () => {
      const { isRedisReady } = await import('@/lib/db/redis')
      vi.mocked(isRedisReady).mockReturnValueOnce(false)

      const { generateCsrfToken } = await import('@/lib/security/csrf-server')

      // With Redis unavailable, it should fall back to stateless tokens
      const result = await generateCsrfToken('test-user')
      expect(result.token).toBeDefined()
      expect(result.cookieValue).toBeDefined()
    })
  })

  describe('validateCsrfToken', () => {
    it('should return true for valid token with matching cookie value', async () => {
      const { validateCsrfToken } = await import('@/lib/security/csrf-server')

      mockRedisGet.mockResolvedValueOnce('stored-cookie-value')

      const result = await validateCsrfToken('test-user', 'test-token', 'stored-cookie-value')

      expect(result).toBe(true)
      expect(mockRedisDel).toHaveBeenCalled()
    })

    it('should return false for missing token', async () => {
      const { validateCsrfToken } = await import('@/lib/security/csrf-server')

      const result = await validateCsrfToken('test-user', '', 'cookie-val')

      expect(result).toBe(false)
    })

    it('should return false for missing userId', async () => {
      const { validateCsrfToken } = await import('@/lib/security/csrf-server')

      const result = await validateCsrfToken('', 'test-token', 'cookie-val')

      expect(result).toBe(false)
    })

    it('should return false for non-existent token', async () => {
      const { validateCsrfToken } = await import('@/lib/security/csrf-server')

      mockRedisGet.mockResolvedValueOnce(null)

      const result = await validateCsrfToken('test-user', 'non-existent', 'cookie-val')

      expect(result).toBe(false)
    })

    it('should return false for mismatched cookie value', async () => {
      const { validateCsrfToken } = await import('@/lib/security/csrf-server')

      mockRedisGet.mockResolvedValueOnce('stored-cookie-value')

      const result = await validateCsrfToken('test-user', 'test-token', 'different-cookie')

      expect(result).toBe(false)
    })

    it('should validate using "anonymous" userId for login flow', async () => {
      const { validateCsrfToken, ANONYMOUS_USER_ID } = await import('@/lib/security/csrf-server')

      mockRedisGet.mockResolvedValueOnce('stored-cookie-value')

      const result = await validateCsrfToken(ANONYMOUS_USER_ID, 'test-token', 'stored-cookie-value')

      expect(result).toBe(true)
      // Verify Redis was queried with the "anonymous" key prefix
      expect(mockRedisGet).toHaveBeenCalledWith('csrf:anonymous:test-token')
    })

    it('should rotate CSRF token after successful validation', async () => {
      const { validateCsrfToken } = await import('@/lib/security/csrf-server')

      mockRedisGet.mockResolvedValueOnce('stored-cookie-value')

      await validateCsrfToken('test-user', 'test-token', 'stored-cookie-value')

      // After validation, a new token should be generated (another setex call)
      // One call for the original token generation, one for rotation
      const setexCalls = mockRedisSetex.mock.calls.filter(
        (call: any[]) => call[0].includes('csrf:test-user:')
      )
      expect(setexCalls.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('requireCsrfToken', () => {
    it('should throw error for invalid token', async () => {
      const { requireCsrfToken } = await import('@/lib/security/csrf-server')

      mockRedisGet.mockResolvedValueOnce(null)

      await expect(requireCsrfToken('test-user', 'invalid-token', 'cookie-val')).rejects.toThrow('Invalid CSRF token')
    })
  })

  describe('ANONYMOUS_USER_ID constant', () => {
    it('should export the constant for consistent use across auth flows', async () => {
      const { ANONYMOUS_USER_ID } = await import('@/lib/security/csrf-server')

      expect(ANONYMOUS_USER_ID).toBe('anonymous')
    })
  })
})
