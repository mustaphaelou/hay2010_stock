import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockPrismaFindUnique, mockPrismaUpdate } = vi.hoisted(() => ({
  mockPrismaFindUnique: vi.fn(),
  mockPrismaUpdate: vi.fn(),
}))

const { mockVerifyPassword } = vi.hoisted(() => ({
  mockVerifyPassword: vi.fn(),
}))

const { mockGenerateToken, mockVerifyToken, mockRevokeToken } = vi.hoisted(() => ({
  mockGenerateToken: vi.fn(),
  mockVerifyToken: vi.fn().mockResolvedValue({ userId: 'user-1', sessionId: 'session-1', jti: 'jti-1' }),
  mockRevokeToken: vi.fn().mockResolvedValue(undefined),
}))

const { mockCreateSession, mockDeleteSession } = vi.hoisted(() => ({
  mockCreateSession: vi.fn().mockResolvedValue('session-1'),
  mockDeleteSession: vi.fn().mockResolvedValue(undefined),
}))

const {
  mockRecordFailedAttempt, mockClearFailedAttempts, mockIsAccountLocked,
  mockIsLockedByIp, mockRecordFailedAttemptByIp, mockClearFailedAttemptsByIp,
} = vi.hoisted(() => ({
  mockRecordFailedAttempt: vi.fn().mockResolvedValue({ remaining: 4, locked: false }),
  mockClearFailedAttempts: vi.fn(),
  mockIsAccountLocked: vi.fn().mockResolvedValue(false),
  mockIsLockedByIp: vi.fn().mockResolvedValue(false),
  mockRecordFailedAttemptByIp: vi.fn(),
  mockClearFailedAttemptsByIp: vi.fn(),
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

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

import { loginUser, logoutUser } from '@/lib/auth/auth-service'

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsLockedByIp.mockResolvedValue(false)
    mockIsAccountLocked.mockResolvedValue(false)
    mockRecordFailedAttempt.mockResolvedValue({ remaining: 4, locked: false })
    mockVerifyPassword.mockResolvedValue(true)
    mockGenerateToken.mockResolvedValue('mock-jwt-token')
    mockPrismaFindUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@test.com',
      name: 'Test User',
      role: 'USER',
      password: 'hashed-password',
    })
  })

  describe('loginUser', () => {
    it('should login successfully with valid credentials', async () => {
      const result = await loginUser('test@test.com', 'correct-password', false, '192.168.1.1')

      expect(result.error).toBeUndefined()
      expect(result.data).toBeDefined()
      expect(result.data?.user.email).toBe('test@test.com')
      expect(result.data?.token).toBe('mock-jwt-token')
      expect(mockClearFailedAttempts).toHaveBeenCalledWith('test@test.com')
      expect(mockClearFailedAttemptsByIp).toHaveBeenCalledWith('192.168.1.1')
      expect(mockCreateSession).toHaveBeenCalledWith('user-1', 'test@test.com', 'Test User', 'USER')
      expect(mockGenerateToken).toHaveBeenCalledWith({
        userId: 'user-1',
        email: 'test@test.com',
        role: 'USER',
        sessionId: 'session-1',
      })
    })

    it('should reject invalid password', async () => {
      mockVerifyPassword.mockResolvedValue(false)

      const result = await loginUser('test@test.com', 'wrong-password', false, '192.168.1.1')

      expect(result.error).toContain('Email ou mot de passe invalide')
      expect(mockRecordFailedAttempt).toHaveBeenCalledWith('test@test.com')
      expect(mockRecordFailedAttemptByIp).toHaveBeenCalledWith('192.168.1.1')
    })

    it('should reject locked account', async () => {
      mockIsAccountLocked.mockResolvedValue(true)

      const result = await loginUser('test@test.com', 'password', false, '192.168.1.1')

      expect(result.error).toContain('Compte temporairement verrouillé')
    })

    it('should reject IP-locked', async () => {
      mockIsLockedByIp.mockResolvedValue(true)

      const result = await loginUser('test@test.com', 'password', false, '192.168.1.1')

      expect(result.error).toContain('Trop de tentatives depuis cet emplacement')
    })

    it('should reject missing user', async () => {
      mockPrismaFindUnique.mockResolvedValue(null)

      const result = await loginUser('nonexistent@test.com', 'password', false, '192.168.1.1')

      expect(result.error).toBe('Email ou mot de passe invalide')
      expect(mockRecordFailedAttempt).toHaveBeenCalledWith('nonexistent@test.com')
      expect(mockRecordFailedAttemptByIp).toHaveBeenCalledWith('192.168.1.1')
    })

    it('should return lockout error when failed attempt triggers lockout', async () => {
      mockVerifyPassword.mockResolvedValue(false)
      mockRecordFailedAttempt.mockResolvedValue({ remaining: 0, locked: true })

      const result = await loginUser('test@test.com', 'wrong-password', false, '192.168.1.1')

      expect(result.error).toContain('Compte verrouillé')
    })
  })

  describe('logoutUser', () => {
    it('should delete session and revoke token on valid session', async () => {
      const result = await logoutUser('valid-token')

      expect(result.error).toBeUndefined()
      expect(mockVerifyToken).toHaveBeenCalledWith('valid-token')
      expect(mockDeleteSession).toHaveBeenCalledWith('session-1')
      expect(mockRevokeToken).toHaveBeenCalledWith('jti-1')
    })

    it('should handle expired/invalid token gracefully', async () => {
      mockVerifyToken.mockResolvedValue(null)

      const result = await logoutUser('expired-token')

      expect(result.error).toBeUndefined()
      expect(mockDeleteSession).not.toHaveBeenCalled()
      expect(mockRevokeToken).not.toHaveBeenCalled()
    })

    it('should handle token without sessionId', async () => {
      mockVerifyToken.mockResolvedValue({ jti: 'jti-1' } as never)

      const result = await logoutUser('token-without-session')

      expect(result.error).toBeUndefined()
      expect(mockDeleteSession).not.toHaveBeenCalled()
      expect(mockRevokeToken).toHaveBeenCalledWith('jti-1')
    })
  })
})
