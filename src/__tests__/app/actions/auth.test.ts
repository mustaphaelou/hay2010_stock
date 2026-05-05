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

const { mockExecuteWrite } = vi.hoisted(() => ({
  mockExecuteWrite: vi.fn(),
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

vi.mock('@/lib/actions/execute-write', () => ({
  executeWrite: mockExecuteWrite,
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
    mockIsLockedByIp.mockResolvedValue(false)
    mockIsAccountLocked.mockResolvedValue(false)
    mockRecordFailedAttempt.mockResolvedValue({ remaining: 4, locked: false })
    mockPrismaFindUnique.mockReset()
    mockPrismaUpdate.mockReset()
  })

  describe('login', () => {
    it('should call executeWrite with csrfToken and loginSchema validation', async () => {
      mockExecuteWrite.mockImplementation(async (options: { writeFn: () => Promise<unknown> }) => {
        return options.writeFn()
      })

      await authModule.login('test@test.com', 'password', false, 'valid-token')

      expect(mockExecuteWrite).toHaveBeenCalledWith(
        expect.objectContaining({
          csrfToken: 'valid-token',
          validation: expect.objectContaining({
            schema: expect.anything(),
            input: { email: 'test@test.com', password: 'password' },
          }),
        })
      )
    })

    it('should reject locked IP inside writeFn', async () => {
      mockExecuteWrite.mockImplementation(async (options: { writeFn: () => Promise<unknown> }) => {
        return options.writeFn()
      })
      mockIsLockedByIp.mockResolvedValue(true)

      const result = await authModule.login('test@test.com', 'password', false, 'valid-token')

      expect(result.error).toContain('Trop de tentatives depuis cet emplacement')
    })

    it('should reject locked account inside writeFn', async () => {
      mockExecuteWrite.mockImplementation(async (options: { writeFn: () => Promise<unknown> }) => {
        return options.writeFn()
      })
      mockIsAccountLocked.mockResolvedValue(true)

      const result = await authModule.login('test@test.com', 'password', false, 'valid-token')

      expect(result.error).toContain('Compte temporairement verrouillé')
    })

    it('should reject non-existent user inside writeFn', async () => {
      mockExecuteWrite.mockImplementation(async (options: { writeFn: () => Promise<unknown> }) => {
        return options.writeFn()
      })
      mockPrismaFindUnique.mockResolvedValue(null)

      const result = await authModule.login('nonexistent@test.com', 'password', false, 'valid-token')

      expect(result.error).toBe('Email ou mot de passe invalide')
      expect(mockRecordFailedAttempt).toHaveBeenCalled()
      expect(mockRecordFailedAttemptByIp).toHaveBeenCalled()
    })

    it('should reject wrong password inside writeFn', async () => {
      mockExecuteWrite.mockImplementation(async (options: { writeFn: () => Promise<unknown> }) => {
        return options.writeFn()
      })
      mockPrismaFindUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        password: 'hashed-password',
      })
      mockVerifyPassword.mockResolvedValue(false)

      const result = await authModule.login('test@test.com', 'wrong-password', false, 'valid-token')

      expect(result.error).toContain('Email ou mot de passe invalide')
    })

    it('should login successfully with valid credentials inside writeFn', async () => {
      mockExecuteWrite.mockImplementation(async (options: { writeFn: () => Promise<unknown> }) => {
        return options.writeFn()
      })
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

    it('should clear lockout on successful login inside writeFn', async () => {
      mockExecuteWrite.mockImplementation(async (options: { writeFn: () => Promise<unknown> }) => {
        return options.writeFn()
      })
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

    it('should return CSRF error when executeWrite returns CSRF error', async () => {
      mockExecuteWrite.mockResolvedValue({ error: 'Jeton de sécurité invalide. Veuillez rafraîchir la page et réessayer.' })

      const result = await authModule.login('test@test.com', 'password', false, 'bad-token')

      expect(result.error).toContain('Jeton de sécurité invalide')
    })

    it('should return validation error when executeWrite returns validation error', async () => {
      mockExecuteWrite.mockResolvedValue({ error: 'Entrée invalide : Adresse email invalide' })

      const result = await authModule.login('', '', false, 'valid-token')

      expect(result.error).toContain('Entrée invalide')
    })
  })

  describe('logout', () => {
    it('should call executeWrite with permission authenticated', async () => {
      mockExecuteWrite.mockImplementation(async (options: { writeFn: () => Promise<unknown> }) => {
        return options.writeFn()
      })

      const result = await authModule.logout('valid-csrf-token')

      expect(mockExecuteWrite).toHaveBeenCalledWith(
        expect.objectContaining({
          permission: 'authenticated',
          csrfToken: 'valid-csrf-token',
        })
      )
      expect(result.success).toBe(true)
      expect(mockDeleteSession).toHaveBeenCalled()
      expect(mockRevokeToken).toHaveBeenCalled()
    })

    it('should return CSRF error when executeWrite returns CSRF error', async () => {
      mockExecuteWrite.mockResolvedValue({ error: 'Jeton de sécurité invalide. Veuillez rafraîchir la page et réessayer.' })

      const result = await authModule.logout('bad-token')

      expect(result.error).toContain('Jeton de sécurité invalide')
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
