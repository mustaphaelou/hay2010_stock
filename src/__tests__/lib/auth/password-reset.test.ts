/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import crypto from 'crypto'

vi.mock('@/lib/db/redis', () => ({
    redisSession: {
        setex: vi.fn().mockResolvedValue('OK'),
        get: vi.fn(),
        del: vi.fn().mockResolvedValue(1),
    }
}))

vi.mock('@/lib/logger', () => ({
    createLogger: () => ({
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    })
}))

describe('Password Reset Token Service', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.resetModules()
    })

    describe('storeResetToken', () => {
        it('should store token with correct key format', async () => {
            const { redisSession } = await import('@/lib/db/redis')
            const { storeResetToken } = await import('@/lib/auth/password-reset')

            const token = 'test-token-123'
            const email = 'test@example.com'

            await storeResetToken(token, email)

            const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
            expect(redisSession.setex).toHaveBeenCalledWith(
                `pwdreset:${hashedToken}`,
                expect.any(Number),
                expect.stringContaining(email)
            )
        })

        it('should store token with TTL of 1 hour', async () => {
            const { redisSession } = await import('@/lib/db/redis')
            const { storeResetToken } = await import('@/lib/auth/password-reset')

            await storeResetToken('test-token', 'test@example.com')

            const call = vi.mocked(redisSession.setex).mock.calls[0]
            expect(call[1]).toBe(3600)
        })

        it('should throw error when Redis fails', async () => {
            const { redisSession } = await import('@/lib/db/redis')
            vi.mocked(redisSession.setex).mockRejectedValueOnce(new Error('Redis error'))

            const { storeResetToken } = await import('@/lib/auth/password-reset')

            await expect(storeResetToken('token', 'test@example.com')).rejects.toThrow('Failed to store reset token')
        })
    })

    describe('getResetToken', () => {
        it('should return token data for valid token', async () => {
            const { redisSession } = await import('@/lib/db/redis')
            const { getResetToken } = await import('@/lib/auth/password-reset')

            const tokenData = { email: 'test@example.com', createdAt: Date.now() }
            vi.mocked(redisSession.get).mockResolvedValueOnce(JSON.stringify(tokenData))

            const result = await getResetToken('test-token')

            expect(result).toEqual(tokenData)
        })

        it('should return null for non-existent token', async () => {
            const { redisSession } = await import('@/lib/db/redis')
            const { getResetToken } = await import('@/lib/auth/password-reset')

            vi.mocked(redisSession.get).mockResolvedValueOnce(null)

            const result = await getResetToken('non-existent')

            expect(result).toBeNull()
        })
    })

    describe('deleteResetToken', () => {
        it('should delete token from Redis', async () => {
            const { redisSession } = await import('@/lib/db/redis')
            const { deleteResetToken } = await import('@/lib/auth/password-reset')

            await deleteResetToken('test-token')

            expect(redisSession.del).toHaveBeenCalled()
        })
    })

    describe('validateResetToken', () => {
        it('should return valid for existing token', async () => {
            const { redisSession } = await import('@/lib/db/redis')
            const { validateResetToken } = await import('@/lib/auth/password-reset')

            const tokenData = { email: 'test@example.com', createdAt: Date.now() }
            vi.mocked(redisSession.get).mockResolvedValueOnce(JSON.stringify(tokenData))

            const result = await validateResetToken('test-token')

            expect(result.valid).toBe(true)
            expect(result.email).toBe('test@example.com')
        })

        it('should return invalid for empty token', async () => {
            const { validateResetToken } = await import('@/lib/auth/password-reset')

            const result = await validateResetToken('')

            expect(result.valid).toBe(false)
            expect(result.error).toBe('Invalid reset token')
        })

        it('should return invalid for non-existent token', async () => {
            const { redisSession } = await import('@/lib/db/redis')
            const { validateResetToken } = await import('@/lib/auth/password-reset')

            vi.mocked(redisSession.get).mockResolvedValueOnce(null)

            const result = await validateResetToken('non-existent')

            expect(result.valid).toBe(false)
            expect(result.error).toBe('Invalid or expired reset token')
        })
    })
})
