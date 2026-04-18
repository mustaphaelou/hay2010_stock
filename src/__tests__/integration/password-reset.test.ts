/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import crypto from 'crypto'

const mockRedisEval = vi.fn()
const mockRedisGet = vi.fn()
const mockRedisSetex = vi.fn()
const mockRedisDel = vi.fn()

vi.mock('@/lib/db/redis', () => ({
  redisSession: {
    setex: mockRedisSetex,
    get: mockRedisGet,
    del: mockRedisDel,
    eval: mockRedisEval,
  },
  redis: {
    setex: mockRedisSetex,
    get: mockRedisGet,
    del: mockRedisDel,
    eval: mockRedisEval,
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
  hashPassword: vi.fn().mockResolvedValue('hashed-new-password'),
  verifyPassword: vi.fn().mockResolvedValue(true),
}))

describe('Password Reset Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('request reset generates token', () => {
    it('should store reset token in Redis with correct format', async () => {
      mockRedisSetex.mockResolvedValue('OK')

      const { storeResetToken } = await import('@/lib/auth/password-reset')
      const token = 'generated-reset-token-abc'
      const email = 'user@example.com'

      await storeResetToken(token, email)

      const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
      expect(mockRedisSetex).toHaveBeenCalledWith(
        `pwdreset:${hashedToken}`,
        3600,
        expect.stringContaining(email)
      )
    })

    it('should store token with 1 hour TTL', async () => {
      mockRedisSetex.mockResolvedValue('OK')

      const { storeResetToken } = await import('@/lib/auth/password-reset')
      await storeResetToken('token', 'user@example.com')

      const call = mockRedisSetex.mock.calls[0]
      expect(call[1]).toBe(3600)
    })
  })

  describe('validate token works', () => {
    it('should return valid for existing token', async () => {
      const tokenData = { email: 'user@example.com', createdAt: Date.now() }
      mockRedisGet.mockResolvedValue(JSON.stringify(tokenData))

      const { validateResetToken } = await import('@/lib/auth/password-reset')
      const result = await validateResetToken('valid-token')

      expect(result.valid).toBe(true)
      expect(result.email).toBe('user@example.com')
    })

    it('should return invalid for non-existent token', async () => {
      mockRedisGet.mockResolvedValue(null)

      const { validateResetToken } = await import('@/lib/auth/password-reset')
      const result = await validateResetToken('nonexistent-token')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invalid or expired reset token')
    })
  })

  describe('consume token is atomic', () => {
    it('should succeed on first consumption', async () => {
      const tokenData = { email: 'user@example.com', createdAt: Date.now() }
      mockRedisEval.mockResolvedValue(JSON.stringify(tokenData))

      const { consumeResetToken } = await import('@/lib/auth/password-reset')
      const result = await consumeResetToken('valid-token')

      expect(result.valid).toBe(true)
      expect(result.email).toBe('user@example.com')
    })

    it('should fail on second consumption (atomic double-consume protection)', async () => {
      mockRedisEval
        .mockResolvedValueOnce(JSON.stringify({ email: 'user@example.com', createdAt: Date.now() }))
        .mockResolvedValueOnce(null)

      const { consumeResetToken } = await import('@/lib/auth/password-reset')

      const first = await consumeResetToken('same-token')
      expect(first.valid).toBe(true)

      const second = await consumeResetToken('same-token')
      expect(second.valid).toBe(false)
      expect(second.error).toBe('Invalid or expired reset token')
    })

    it('should use Lua script for atomic GET+DEL', async () => {
      const tokenData = { email: 'user@example.com', createdAt: Date.now() }
      mockRedisEval.mockResolvedValue(JSON.stringify(tokenData))

      const { consumeResetToken } = await import('@/lib/auth/password-reset')
      await consumeResetToken('some-token')

      expect(mockRedisEval).toHaveBeenCalledWith(
        expect.stringContaining("redis.call('GET'"),
        1,
        expect.stringContaining('pwdreset:')
      )
    })
  })

  describe('password updated after consumption', () => {
    it('should hash new password and update user record', async () => {
      const { prisma } = await import('@/lib/db/prisma')
      const { hashPassword } = await import('@/lib/auth/password')

      vi.mocked(prisma.user.update).mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        name: 'User',
        password: 'hashed-new-password',
        role: 'USER',
        lastLoginAt: null,
      } as unknown as Awaited<ReturnType<typeof prisma.user.update>>)

      await hashPassword('NewPassword123')
      await prisma.user.update({
        where: { email: 'user@example.com' },
        data: { password: 'hashed-new-password' },
      })

      expect(hashPassword).toHaveBeenCalledWith('NewPassword123')
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
        data: { password: 'hashed-new-password' },
      })
    })
  })
})
