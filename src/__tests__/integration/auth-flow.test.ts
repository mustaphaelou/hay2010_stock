/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRedisSetex = vi.fn().mockResolvedValue('OK')
const mockRedisGet = vi.fn()
const mockRedisDel = vi.fn().mockResolvedValue(1)
const mockRedisExpire = vi.fn().mockResolvedValue(1)
const mockRedisExists = vi.fn().mockResolvedValue(0)

vi.mock('@/lib/db/redis', () => ({
  redis: {
    setex: mockRedisSetex,
    get: mockRedisGet,
    del: mockRedisDel,
    expire: mockRedisExpire,
    exists: mockRedisExists,
    ping: vi.fn().mockResolvedValue('PONG'),
  },
  isRedisReady: vi.fn().mockReturnValue(true),
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth/password', () => ({
  verifyPassword: vi.fn().mockResolvedValue(true),
  hashPassword: vi.fn().mockResolvedValue('hashed-password'),
}))

vi.mock('@/lib/auth/jwt', () => ({
  generateToken: vi.fn().mockResolvedValue('mock-jwt-token'),
  verifyToken: vi.fn().mockResolvedValue({
    userId: 'user-1',
    email: 'user@example.com',
    role: 'USER',
    sessionId: 'test-session-id',
    jti: 'test-jti',
  }),
  revokeToken: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/auth/lockout', () => ({
  isAccountLocked: vi.fn().mockResolvedValue(false),
  isLockedByIp: vi.fn().mockResolvedValue(false),
  recordFailedAttempt: vi.fn().mockResolvedValue({ locked: false, remaining: 5 }),
  clearFailedAttempts: vi.fn().mockResolvedValue(undefined),
  recordFailedAttemptByIp: vi.fn().mockResolvedValue(undefined),
  clearFailedAttemptsByIp: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/security/csrf-server', () => ({
  validateCsrfToken: vi.fn().mockResolvedValue(true),
  getCsrfCookie: vi.fn().mockResolvedValue('csrf-cookie-value'),
  generateCsrfToken: vi.fn().mockResolvedValue({ token: 'new-csrf-token', cookieValue: 'new-csrf-cookie' }),
  setCsrfCookie: vi.fn().mockResolvedValue(undefined),
  ANONYMOUS_USER_ID: 'anonymous',
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn((name: string) => {
      if (name === 'auth_token') return { value: 'mock-jwt-token' }
      if (name === 'csrf_token') return { value: 'csrf-cookie-value' }
      return undefined
    }),
    set: vi.fn(),
    delete: vi.fn(),
  }),
  headers: vi.fn().mockResolvedValue({
    get: vi.fn((name: string) => {
      if (name === 'x-forwarded-for') return '127.0.0.1'
      if (name === 'x-real-ip') return null
      return null
    }),
  }),
}))

vi.mock('@/lib/auth/user-utils', () => ({
  getCurrentUser: vi.fn(),
}))

vi.mock('next/server', () => ({
  after: vi.fn((fn) => fn()),
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

describe('Auth Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('login creates session', () => {
    it('should create session in Redis and return success', async () => {
      const { prisma } = await import('@/lib/db/prisma')
      const { verifyPassword } = await import('@/lib/auth/password')
      const { login } = await import('@/app/actions/auth')
      const { validateCsrfToken } = await import('@/lib/security/csrf-server')

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        name: 'Test User',
        password: 'hashed-password',
        role: 'USER',
        lastLoginAt: null,
      } as unknown as Awaited<ReturnType<typeof prisma.user.findUnique>>)

      vi.mocked(prisma.user.update).mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        name: 'Test User',
        password: 'hashed-password',
        role: 'USER',
        lastLoginAt: new Date(),
      } as unknown as Awaited<ReturnType<typeof prisma.user.update>>)

      const result = await login('user@example.com', 'password123', false, 'csrf-token')

      expect(result.success).toBe(true)
      expect(verifyPassword).toHaveBeenCalledWith('password123', 'hashed-password')
      expect(mockRedisSetex).toHaveBeenCalled()

      // Verify CSRF was validated with ANONYMOUS_USER_ID
      expect(validateCsrfToken).toHaveBeenCalledWith('anonymous', 'csrf-token', 'csrf-cookie-value')

      const setexCall = mockRedisSetex.mock.calls[0]
      expect(setexCall[0]).toMatch(/^session:/)
      expect(setexCall[1]).toBe(604800)
    })

    it('should return error for invalid credentials', async () => {
      const { prisma } = await import('@/lib/db/prisma')
      const { verifyPassword } = await import('@/lib/auth/password')
      const { login } = await import('@/app/actions/auth')

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        name: 'Test User',
        password: 'hashed-password',
        role: 'USER',
        lastLoginAt: null,
      } as unknown as Awaited<ReturnType<typeof prisma.user.findUnique>>)

      vi.mocked(verifyPassword).mockResolvedValueOnce(false)

      const result = await login('user@example.com', 'wrongpassword', false, 'csrf-token')

      expect(result.error).toBeDefined()
      expect(result.success).toBeUndefined()
    })

    it('should reject login without CSRF token', async () => {
      const { login } = await import('@/app/actions/auth')

      const result = await login('user@example.com', 'password123', false)

      expect(result.error).toContain('Jeton de sécurité requis')
    })

    it('should reject login with invalid CSRF token', async () => {
      const { validateCsrfToken } = await import('@/lib/security/csrf-server')
      const { login } = await import('@/app/actions/auth')

      vi.mocked(validateCsrfToken).mockResolvedValueOnce(false)

      const result = await login('user@example.com', 'password123', false, 'bad-csrf-token')

      expect(result.error).toContain('Jeton de sécurité invalide')
    })
  })

  describe('getCurrentUser returns user', () => {
    it('should return user data when valid session exists', async () => {
      const { getCurrentUser: getCachedUser } = await import('@/lib/auth/user-utils')
      const { getCurrentUser } = await import('@/app/actions/auth')

      vi.mocked(getCachedUser).mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        name: 'Test User',
        role: 'USER',
      })

      const user = await getCurrentUser()

      expect(user).not.toBeNull()
      expect(user?.email).toBe('user@example.com')
      expect(user?.name).toBe('Test User')
      expect(user?.role).toBe('USER')
    })

    it('should return null when no session exists', async () => {
      const { getCurrentUser: getCachedUser } = await import('@/lib/auth/user-utils')
      const { getCurrentUser } = await import('@/app/actions/auth')

      vi.mocked(getCachedUser).mockResolvedValue(null)

      const user = await getCurrentUser()

      expect(user).toBeNull()
    })
  })

  describe('logout invalidates session', () => {
    it('should delete session from Redis and clear cookie', async () => {
      const { logout } = await import('@/app/actions/auth')
      const { cookies } = await import('next/headers')

      const mockCookieStore = {
        get: vi.fn((name: string) => {
          if (name === 'auth_token') return { value: 'mock-jwt-token' }
          if (name === 'csrf_token') return { value: 'csrf-cookie-value' }
          return undefined
        }),
        set: vi.fn(),
        delete: vi.fn(),
      }
      vi.mocked(cookies).mockResolvedValue(mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>)

      const result = await logout('csrf-token')

      expect(result.success).toBe(true)
      expect(mockRedisDel).toHaveBeenCalled()
      expect(mockCookieStore.delete).toHaveBeenCalledWith('auth_token')
    })

    it('should return success even when no token exists', async () => {
      const { logout } = await import('@/app/actions/auth')
      const { cookies } = await import('next/headers')

      const mockCookieStore = {
        get: vi.fn((name: string) => {
          if (name === 'csrf_token') return { value: 'csrf-cookie-value' }
          return undefined
        }),
        set: vi.fn(),
        delete: vi.fn(),
      }
      vi.mocked(cookies).mockResolvedValue(mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>)

      const result = await logout('csrf-token')

      expect(result.success).toBe(true)
      expect(mockCookieStore.delete).toHaveBeenCalledWith('auth_token')
    })

    it('should validate CSRF token with authenticated userId during logout', async () => {
      const { logout } = await import('@/app/actions/auth')
      const { validateCsrfToken } = await import('@/lib/security/csrf-server')
      const { cookies } = await import('next/headers')

      const mockCookieStore = {
        get: vi.fn((name: string) => {
          if (name === 'auth_token') return { value: 'mock-jwt-token' }
          if (name === 'csrf_token') return { value: 'csrf-cookie-value' }
          return undefined
        }),
        set: vi.fn(),
        delete: vi.fn(),
      }
      vi.mocked(cookies).mockResolvedValue(mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>)

      await logout('csrf-token')

      // For logout, since the user is authenticated, it should use the user's ID
      expect(validateCsrfToken).toHaveBeenCalledWith('user-1', 'csrf-token', 'csrf-cookie-value')
    })
  })
})
