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
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: 'mock-jwt-token' }),
    set: vi.fn(),
    delete: vi.fn(),
  }),
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
  })

  describe('getCurrentUser returns user', () => {
    it('should return user data when valid session exists', async () => {
      const { prisma } = await import('@/lib/db/prisma')
      const { getCurrentUser } = await import('@/app/actions/auth')

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        name: 'Test User',
        role: 'USER',
      } as unknown as Awaited<ReturnType<typeof prisma.user.findUnique>>)

      const user = await getCurrentUser()

      expect(user).not.toBeNull()
      expect(user?.email).toBe('user@example.com')
      expect(user?.name).toBe('Test User')
      expect(user?.role).toBe('USER')
    })

    it('should return null when no session exists', async () => {
      const { cookies } = await import('next/headers')
      vi.mocked(cookies).mockResolvedValueOnce({
        get: vi.fn().mockReturnValue(undefined),
        set: vi.fn(),
        delete: vi.fn(),
      } as unknown as Awaited<ReturnType<typeof cookies>>)

      const { getCurrentUser } = await import('@/app/actions/auth')
      const user = await getCurrentUser()

      expect(user).toBeNull()
    })
  })

  describe('logout invalidates session', () => {
    it('should delete session from Redis and clear cookie', async () => {
      const { deleteSession } = await import('@/lib/auth/session')
      const { logout } = await import('@/app/actions/auth')
      const { cookies } = await import('next/headers')

      const mockCookieStore = {
        get: vi.fn().mockReturnValue({ value: 'mock-jwt-token' }),
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
        get: vi.fn().mockReturnValue(undefined),
        set: vi.fn(),
        delete: vi.fn(),
      }
      vi.mocked(cookies).mockResolvedValue(mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>)

      const result = await logout('csrf-token')

      expect(result.success).toBe(true)
      expect(mockCookieStore.delete).toHaveBeenCalledWith('auth_token')
    })
  })
})
