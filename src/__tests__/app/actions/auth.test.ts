import { describe, it, expect, beforeEach, vi } from 'vitest'

const { mockVerifyPassword } = vi.hoisted(() => ({
  mockVerifyPassword: vi.fn(),
}))

const { mockGenerateToken, mockVerifyToken, mockRevokeToken } = vi.hoisted(() => ({
  mockGenerateToken: vi.fn().mockResolvedValue('mock-jwt-token'),
  mockVerifyToken: vi.fn().mockResolvedValue({ userId: 'user-1', sessionId: 'session-1', jti: 'jti-1' }),
  mockRevokeToken: vi.fn().mockResolvedValue(undefined),
}))

const { mockCreateSession, mockDeleteSession } = vi.hoisted(() => ({
  mockCreateSession: vi.fn().mockResolvedValue('session-1'),
  mockDeleteSession: vi.fn().mockResolvedValue(undefined),
}))

const { mockRecordFailedAttempt, mockClearFailedAttempts, mockIsAccountLocked, mockIsLockedByIp, mockRecordFailedAttemptByIp, mockClearFailedAttemptsByIp } = vi.hoisted(() => ({
  mockRecordFailedAttempt: vi.fn().mockResolvedValue({ remaining: 4, locked: false }),
  mockClearFailedAttempts: vi.fn(),
  mockIsAccountLocked: vi.fn().mockResolvedValue(false),
  mockIsLockedByIp: vi.fn().mockResolvedValue(false),
  mockRecordFailedAttemptByIp: vi.fn(),
  mockClearFailedAttemptsByIp: vi.fn(),
}))

const { mockValidateCsrf, mockGetCsrfCookie, mockGenerateCsrfToken, mockSetCsrfCookie } = vi.hoisted(() => ({
  mockValidateCsrf: vi.fn().mockResolvedValue(true),
  mockGetCsrfCookie: vi.fn().mockResolvedValue('mock-csrf-cookie'),
  mockGenerateCsrfToken: vi.fn(),
  mockSetCsrfCookie: vi.fn(),
}))

const { mockPrismaFindUnique, mockPrismaUpdate } = vi.hoisted(() => ({
  mockPrismaFindUnique: vi.fn(),
  mockPrismaUpdate: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: mockPrismaFindUnique,
      update: mockPrismaUpdate,
    },
  },
}))

vi.mock('@/lib/auth/password', () => ({
  verifyPassword: mockVerifyPassword,
  hashPassword: vi.fn(),
}))

vi.mock('@/lib/auth/jwt', () => ({
  generateToken: mockGenerateToken,
  verifyToken: mockVerifyToken,
  revokeToken: mockRevokeToken,
}))

vi.mock('@/lib/auth/session', () => ({
  createSession: mockCreateSession,
  deleteSession: mockDeleteSession,
}))

vi.mock('@/lib/auth/lockout', () => ({
  recordFailedAttempt: mockRecordFailedAttempt,
  clearFailedAttempts: mockClearFailedAttempts,
  isAccountLocked: mockIsAccountLocked,
  isLockedByIp: mockIsLockedByIp,
  recordFailedAttemptByIp: mockRecordFailedAttemptByIp,
  clearFailedAttemptsByIp: mockClearFailedAttemptsByIp,
}))

vi.mock('@/lib/security/csrf-server', () => ({
  validateCsrfToken: mockValidateCsrf,
  getCsrfCookie: mockGetCsrfCookie,
  generateCsrfToken: mockGenerateCsrfToken,
  setCsrfCookie: mockSetCsrfCookie,
  ANONYMOUS_USER_ID: 'anonymous',
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

vi.mock('@/lib/auth/user-utils', () => ({
  getCurrentUser: vi.fn().mockResolvedValue({ id: 'user-1', email: 'test@example.com', name: 'Test User', role: 'USER' }),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: 'mock-auth-token' }),
    set: vi.fn(),
    delete: vi.fn(),
  }),
  headers: vi.fn().mockResolvedValue(new Map([['x-forwarded-for', '127.0.0.1']])),
}))

vi.mock('next/server', () => ({
  after: vi.fn((fn) => fn()),
}))

import * as authModule from '@/app/actions/auth'

describe('Auth Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockValidateCsrf.mockResolvedValue(true)
    mockGetCsrfCookie.mockResolvedValue('mock-csrf-cookie')
    mockRecordFailedAttempt.mockResolvedValue({ remaining: 4, locked: false })
    mockIsAccountLocked.mockResolvedValue(false)
    mockIsLockedByIp.mockResolvedValue(false)
    mockPrismaFindUnique.mockReset()
    mockPrismaUpdate.mockReset()
  })

  describe('login', () => {
    it('should reject missing CSRF token', async () => {
      const result = await authModule.login('test@test.com', 'password', false)

      expect(result.error).toBe('Security token required. Please refresh the page.')
    })

    it('should reject invalid CSRF token', async () => {
      mockValidateCsrf.mockResolvedValue(false)

      const result = await authModule.login('test@test.com', 'password', false, 'bad-token')

      expect(result.error).toContain('Invalid security token')
    })

    it('should reject locked IP', async () => {
      mockIsLockedByIp.mockResolvedValue(true)

      const result = await authModule.login('test@test.com', 'password', false, 'valid-token')

      expect(result.error).toContain('Too many failed attempts from this location')
    })

    it('should reject locked account', async () => {
      mockIsAccountLocked.mockResolvedValue(true)

      const result = await authModule.login('test@test.com', 'password', false, 'valid-token')

      expect(result.error).toContain('Account is temporarily locked')
    })

    it('should reject invalid input', async () => {
      const result = await authModule.login('', '', false, 'valid-token')

      expect(result.error).toContain('Invalid input')
    })

    it('should reject non-existent user', async () => {
      mockPrismaFindUnique.mockResolvedValue(null)

      const result = await authModule.login('nonexistent@test.com', 'password', false, 'valid-token')

      expect(result.error).toBe('Invalid email or password')
      expect(mockRecordFailedAttempt).toHaveBeenCalled()
      expect(mockRecordFailedAttemptByIp).toHaveBeenCalled()
    })

    it('should reject wrong password', async () => {
      mockPrismaFindUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        password: 'hashed-password',
      })
      mockVerifyPassword.mockResolvedValue(false)

      const result = await authModule.login('test@test.com', 'wrong-password', false, 'valid-token')

      expect(result.error).toContain('Invalid email or password')
    })

    it('should login successfully with valid credentials', async () => {
      mockPrismaFindUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        name: 'Test User',
        role: 'USER',
        password: 'hashed-password',
      })
      mockVerifyPassword.mockResolvedValue(true)

      const result = await authModule.login('test@test.com', 'correct-password', false, 'valid-token')

      expect(result.success).toBe(true)
      expect(mockClearFailedAttempts).toHaveBeenCalledWith('test@test.com')
      expect(mockClearFailedAttemptsByIp).toHaveBeenCalledWith('127.0.0.1')
      expect(mockCreateSession).toHaveBeenCalled()
      expect(mockGenerateToken).toHaveBeenCalled()
    })

    it('should clear lockout on successful login', async () => {
      mockPrismaFindUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        name: 'Test User',
        role: 'USER',
        password: 'hashed-password',
      })
      mockVerifyPassword.mockResolvedValue(true)

      await authModule.login('test@test.com', 'correct-password', false, 'valid-token')

      expect(mockClearFailedAttempts).toHaveBeenCalled()
      expect(mockClearFailedAttemptsByIp).toHaveBeenCalled()
    })
  })

  describe('logout', () => {
    it('should reject missing CSRF token', async () => {
      const result = await authModule.logout()

      expect(result.error).toBe('Security token required. Please refresh the page.')
    })

    it('should reject invalid CSRF token', async () => {
      mockValidateCsrf.mockResolvedValue(false)

      const result = await authModule.logout('bad-token')

      expect(result.error).toContain('Invalid security token')
    })

    it('should logout successfully with valid CSRF token', async () => {
      const result = await authModule.logout('valid-csrf-token')

      expect(result.success).toBe(true)
      expect(mockDeleteSession).toHaveBeenCalled()
      expect(mockRevokeToken).toHaveBeenCalled()
    })
  })

  describe('getCurrentUser', () => {
    it('should return user from cached version', async () => {
      const user = await authModule.getCurrentUser()

      expect(user).toBeDefined()
      expect(user?.email).toBe('test@example.com')
    })
  })
})
