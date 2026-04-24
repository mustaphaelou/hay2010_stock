import { describe, it, expect, beforeEach, vi } from 'vitest'

const { mockHashPassword } = vi.hoisted(() => ({
  mockHashPassword: vi.fn().mockResolvedValue('hashed-password'),
}))

const { mockValidateCsrf, mockGetCsrfCookie, mockGenerateCsrfToken, mockSetCsrfCookie } = vi.hoisted(() => ({
  mockValidateCsrf: vi.fn().mockResolvedValue(true),
  mockGetCsrfCookie: vi.fn().mockResolvedValue('mock-csrf-cookie'),
  mockGenerateCsrfToken: vi.fn(),
  mockSetCsrfCookie: vi.fn(),
}))

const { mockRedisIncrFn, mockRedisExpireFn } = vi.hoisted(() => ({
  mockRedisIncrFn: vi.fn().mockResolvedValue(1),
  mockRedisExpireFn: vi.fn().mockResolvedValue(1),
}))

const { mockPrismaFindUnique, mockPrismaCreate } = vi.hoisted(() => ({
  mockPrismaFindUnique: vi.fn(),
  mockPrismaCreate: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: mockPrismaFindUnique,
      create: mockPrismaCreate,
    },
  },
}))

vi.mock('@/lib/auth/password', () => ({
  hashPassword: mockHashPassword,
  verifyPassword: vi.fn(),
}))

vi.mock('@/lib/security/csrf-server', () => ({
  validateCsrfToken: mockValidateCsrf,
  getCsrfCookie: mockGetCsrfCookie,
  generateCsrfToken: mockGenerateCsrfToken,
  setCsrfCookie: mockSetCsrfCookie,
  ANONYMOUS_USER_ID: 'anonymous',
}))

vi.mock('@/lib/db/redis', () => ({
  redis: {
    incr: mockRedisIncrFn,
    expire: mockRedisExpireFn,
  },
  isRedisReady: vi.fn().mockReturnValue(true),
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue('127.0.0.1'),
  }),
}))

import * as registrationModule from '@/app/actions/registration'

describe('Registration Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockValidateCsrf.mockResolvedValue(true)
    mockGetCsrfCookie.mockResolvedValue('mock-csrf-cookie')
    mockRedisIncrFn.mockResolvedValue(1)
    mockRedisExpireFn.mockResolvedValue(1)
    mockPrismaFindUnique.mockReset()
    mockPrismaCreate.mockReset()
  })

  describe('publicRegister', () => {
    it('should reject missing CSRF token', async () => {
      const result = await registrationModule.publicRegister('test@test.com', 'password123', 'Test User')

      expect(result.error).toBeDefined()
      expect(result.error).toContain('Jeton')
    })

    it('should reject invalid CSRF token', async () => {
      mockValidateCsrf.mockResolvedValue(false)

      const result = await registrationModule.publicRegister('test@test.com', 'password123', 'Test User', 'bad-token')

      expect(result.error).toBeDefined()
      expect(result.error).toContain('Jeton')
    })

    it('should reject when rate limited', async () => {
      mockRedisIncrFn.mockResolvedValue(100)

      const result = await registrationModule.publicRegister('test@test.com', 'password123', 'Test User', 'valid-token')

      expect(result.error).toContain('Too many registration attempts')
    })

    it('should reject invalid email', async () => {
      const result = await registrationModule.publicRegister('not-an-email', 'password123', 'Test User', 'valid-token')

      expect(result.error).toContain('Invalid input')
    })

    it('should reject short password', async () => {
      const result = await registrationModule.publicRegister('test@test.com', 'short', 'Test User', 'valid-token')

      expect(result.error).toContain('Invalid input')
    })

    it('should reject empty name', async () => {
      const result = await registrationModule.publicRegister('test@test.com', 'password123', '', 'valid-token')

      expect(result.error).toContain('Invalid input')
    })

    it('should reject existing user', async () => {
      mockPrismaFindUnique.mockResolvedValue({
        id: 'existing-user',
        email: 'test@test.com',
      })

      const result = await registrationModule.publicRegister('test@test.com', 'Password123!', 'Test User', 'valid-token')

      expect(result.error).toContain('already exists')
    })

    it('should register successfully with valid data', async () => {
      mockPrismaFindUnique.mockResolvedValue(null)
      mockPrismaCreate.mockResolvedValue({
        id: 'new-user',
        email: 'test@test.com',
      })

      const result = await registrationModule.publicRegister('test@test.com', 'Password123!', 'Test User', 'valid-token')

      expect(result.success).toBe(true)
      expect(mockHashPassword).toHaveBeenCalledWith('Password123!')
      expect(mockPrismaCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'test@test.com',
            name: 'Test User',
            role: 'USER',
          }),
        })
      )
    })

    it('should normalize email to lowercase', async () => {
      mockPrismaFindUnique.mockResolvedValue(null)
      mockPrismaCreate.mockResolvedValue({ id: 'new-user' })

      await registrationModule.publicRegister('Test@Example.COM', 'Password123!', 'Test User', 'valid-token')

      expect(mockPrismaCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'test@example.com',
          }),
        })
      )
    })
  })
})
