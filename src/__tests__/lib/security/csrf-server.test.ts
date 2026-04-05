/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/redis', () => ({
    redis: {
        setex: vi.fn().mockResolvedValue('OK'),
        get: vi.fn(),
        del: vi.fn().mockResolvedValue(1),
    },
    isRedisReady: vi.fn().mockReturnValue(true),
}))

vi.mock('@/app/actions/auth', () => ({
    getCurrentUser: vi.fn().mockResolvedValue({ id: 'test-user-id', email: 'test@example.com', name: 'Test User', role: 'USER' }),
}))

vi.mock('next/headers', () => ({
    cookies: vi.fn().mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: 'test-csrf-cookie' }),
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

        it('should store token in Redis with correct key', async () => {
            const { redis } = await import('@/lib/db/redis')
            const { generateCsrfToken } = await import('@/lib/security/csrf-server')

            await generateCsrfToken('test-user')

            expect(redis.setex).toHaveBeenCalledWith(
                expect.stringContaining('csrf:test-user:'),
                expect.any(Number),
                expect.any(String)
            )
        })

        it('should throw error when Redis is not ready', async () => {
            const { isRedisReady } = await import('@/lib/db/redis')
            vi.mocked(isRedisReady).mockReturnValueOnce(false)

            const { generateCsrfToken } = await import('@/lib/security/csrf-server')

            await expect(generateCsrfToken('test-user')).rejects.toThrow('CSRF service unavailable')
        })
    })

    describe('validateCsrfToken', () => {
        it('should return true for valid token', async () => {
            const { redis } = await import('@/lib/db/redis')
            const { validateCsrfToken } = await import('@/lib/security/csrf-server')

            vi.mocked(redis.get).mockResolvedValueOnce('stored-cookie-value')

            const result = await validateCsrfToken('test-user', 'test-token')

            expect(result).toBe(true)
            expect(redis.del).toHaveBeenCalled()
        })

        it('should return false for missing token', async () => {
            const { validateCsrfToken } = await import('@/lib/security/csrf-server')

            const result = await validateCsrfToken('test-user', '')

            expect(result).toBe(false)
        })

        it('should return false for missing userId', async () => {
            const { validateCsrfToken } = await import('@/lib/security/csrf-server')

            const result = await validateCsrfToken('', 'test-token')

            expect(result).toBe(false)
        })

        it('should return false for non-existent token', async () => {
            const { redis } = await import('@/lib/db/redis')
            const { validateCsrfToken } = await import('@/lib/security/csrf-server')

            vi.mocked(redis.get).mockResolvedValueOnce(null)

            const result = await validateCsrfToken('test-user', 'non-existent')

            expect(result).toBe(false)
        })

        it('should return false for mismatched cookie value', async () => {
            const { redis } = await import('@/lib/db/redis')
            const { validateCsrfToken } = await import('@/lib/security/csrf-server')

            vi.mocked(redis.get).mockResolvedValueOnce('stored-cookie-value')

            const result = await validateCsrfToken('test-user', 'test-token', 'different-cookie')

            expect(result).toBe(false)
        })
    })

    describe('requireCsrfToken', () => {
        it('should throw error for invalid token', async () => {
            const { redis } = await import('@/lib/db/redis')
            const { requireCsrfToken } = await import('@/lib/security/csrf-server')

            vi.mocked(redis.get).mockResolvedValueOnce(null)

            await expect(requireCsrfToken('test-user', 'invalid-token')).rejects.toThrow('Invalid CSRF token')
        })
    })
})
