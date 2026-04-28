import { describe, it, expect, beforeEach, vi } from 'vitest'

const { mockStoreResetToken, mockConsumeResetToken, mockValidateResetToken } = vi.hoisted(() => ({
  mockStoreResetToken: vi.fn().mockResolvedValue(undefined),
  mockConsumeResetToken: vi.fn().mockResolvedValue({ valid: true, email: 'user@test.com' }),
  mockValidateResetToken: vi.fn().mockResolvedValue({ valid: true, email: 'user@test.com' }),
}))

const { mockHashPassword } = vi.hoisted(() => ({
  mockHashPassword: vi.fn().mockResolvedValue('hashed-password'),
}))

const { mockUserFindUnique, mockUserUpdate } = vi.hoisted(() => ({
  mockUserFindUnique: vi.fn(),
  mockUserUpdate: vi.fn().mockResolvedValue({ id: 'user-1' }),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
      update: mockUserUpdate,
    },
  },
}))

vi.mock('@/lib/auth/password-reset', () => ({
  storeResetToken: mockStoreResetToken,
  consumeResetToken: mockConsumeResetToken,
  validateResetToken: mockValidateResetToken,
}))

vi.mock('@/lib/auth/password', () => ({
  hashPassword: mockHashPassword,
  verifyPassword: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

import { requestPasswordReset, validateResetTokenAction, resetPassword } from '@/app/actions/password-reset'

describe('Password Reset Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStoreResetToken.mockResolvedValue(undefined)
    mockConsumeResetToken.mockResolvedValue({ valid: true, email: 'user@test.com' })
    mockValidateResetToken.mockResolvedValue({ valid: true, email: 'user@test.com' })
    mockHashPassword.mockResolvedValue('hashed-password')
    mockUserUpdate.mockResolvedValue({ id: 'user-1' })
  })

  describe('requestPasswordReset', () => {
    it('should return success message for invalid email format', async () => {
      const result = await requestPasswordReset('not-an-email')

      expect(result.success).toBe(true)
      expect(result.message).toContain('If this email is registered')
    })

    it('should return same success message for non-existent user', async () => {
      mockUserFindUnique.mockResolvedValue(null)

      const result = await requestPasswordReset('nonexistent@test.com')

      expect(result.success).toBe(true)
      expect(result.message).toContain('If this email is registered')
      expect(mockStoreResetToken).not.toHaveBeenCalled()
    })

    it('should store reset token for existing user', async () => {
      mockUserFindUnique.mockResolvedValue({ id: 'user-1', email: 'user@test.com' })

      const result = await requestPasswordReset('user@test.com')

      expect(result.success).toBe(true)
      expect(mockStoreResetToken).toHaveBeenCalled()
    })

    it('should normalize email to lowercase', async () => {
      mockUserFindUnique.mockResolvedValue({ id: 'user-1', email: 'user@test.com' })

      await requestPasswordReset('USER@TEST.COM')

      expect(mockUserFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: 'user@test.com' } })
      )
    })

    it('should return error on unexpected failure', async () => {
      mockUserFindUnique.mockRejectedValue(new Error('DB error'))

      const result = await requestPasswordReset('user@test.com')

      expect(result.error).toBe('Une erreur inattendue est survenue')
    })
  })

  describe('validateResetTokenAction', () => {
    it('should delegate to validateResetToken', async () => {
      const result = await validateResetTokenAction('valid-token')

      expect(mockValidateResetToken).toHaveBeenCalledWith('valid-token')
      expect(result.valid).toBe(true)
    })

    it('should return invalid for bad token', async () => {
      mockValidateResetToken.mockResolvedValue({ valid: false, error: 'Invalid or expired reset token' })

      const result = await validateResetTokenAction('bad-token')

      expect(result.valid).toBe(false)
    })
  })

  describe('resetPassword', () => {
    it('should reject invalid/expired token', async () => {
      mockConsumeResetToken.mockResolvedValue({ valid: false, error: 'Invalid or expired reset token' })

      const result = await resetPassword('bad-token', 'NewPass123')

      expect(result.error).toContain('Invalid or expired reset token')
    })

    it('should reject weak password', async () => {
      mockConsumeResetToken.mockResolvedValue({ valid: true, email: 'user@test.com' })

      const result = await resetPassword('valid-token', 'weak')

      expect(result.error).toBeDefined()
    })

    it('should reset password with valid token and strong password', async () => {
      const result = await resetPassword('valid-token', 'StrongPass123')

      expect(result.success).toBe(true)
      expect(mockHashPassword).toHaveBeenCalledWith('StrongPass123')
      expect(mockUserUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'user@test.com' },
        })
      )
    })

    it('should return error on unexpected failure', async () => {
      mockConsumeResetToken.mockRejectedValue(new Error('Redis error'))

      const result = await resetPassword('valid-token', 'StrongPass123')

      expect(result.error).toBe('Une erreur inattendue est survenue')
    })
  })
})
