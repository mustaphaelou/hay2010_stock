/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/redis', () => ({
    redis: {
        setex: vi.fn().mockResolvedValue('OK'),
        get: vi.fn(),
        del: vi.fn().mockResolvedValue(1),
        expire: vi.fn().mockResolvedValue(1),
        ping: vi.fn().mockResolvedValue('PONG'),
    },
    isRedisReady: vi.fn().mockReturnValue(true),
}))

vi.mock('@/lib/logger', () => ({
    createLogger: () => ({
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    })
}))

describe('Session Management', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('createSession', () => {
        it('should create session and return session ID', async () => {
            const { redis } = await import('@/lib/db/redis')
            const { createSession } = await import('@/lib/auth/session')

            const sessionId = await createSession('user-123', 'test@example.com', 'Test User', 'USER')

            expect(sessionId).toBeDefined()
            expect(sessionId).toHaveLength(32)
            expect(redis.setex).toHaveBeenCalled()
        })

        it('should store session data with correct TTL', async () => {
            const { redis } = await import('@/lib/db/redis')
            const { createSession } = await import('@/lib/auth/session')

            await createSession('user-123', 'test@example.com', 'Test User', 'USER')

            const call = vi.mocked(redis.setex).mock.calls[0]
            expect(call[1]).toBe(60 * 60 * 24 * 7)
        })

        it('should store complete session data', async () => {
            const { redis } = await import('@/lib/db/redis')
            const { createSession } = await import('@/lib/auth/session')

            await createSession('user-123', 'test@example.com', 'Test User', 'USER')

            const call = vi.mocked(redis.setex).mock.calls[0]
            const storedData = JSON.parse(call[2] as string)
            expect(storedData).toEqual({
                userId: 'user-123',
                email: 'test@example.com',
                name: 'Test User',
                role: 'USER',
                createdAt: expect.any(Number)
            })
        })
    })

    describe('getSession', () => {
        it('should return session data for valid session', async () => {
            const { redis } = await import('@/lib/db/redis')
            const { getSession } = await import('@/lib/auth/session')

            const sessionData = {
                userId: 'user-123',
                email: 'test@example.com',
                name: 'Test User',
                role: 'USER',
                createdAt: Date.now()
            }
            vi.mocked(redis.get).mockResolvedValueOnce(JSON.stringify(sessionData))

            const result = await getSession('test-session-id')

            expect(result).toEqual(sessionData)
        })

        it('should return null for non-existent session', async () => {
            const { redis } = await import('@/lib/db/redis')
            const { getSession } = await import('@/lib/auth/session')

            vi.mocked(redis.get).mockResolvedValueOnce(null)

            const result = await getSession('non-existent')

            expect(result).toBeNull()
        })

        it('should return null for invalid JSON', async () => {
            const { redis } = await import('@/lib/db/redis')
            const { getSession } = await import('@/lib/auth/session')

            vi.mocked(redis.get).mockResolvedValueOnce('invalid-json')

            const result = await getSession('test-session-id')

            expect(result).toBeNull()
        })
    })

    describe('deleteSession', () => {
        it('should delete session from Redis', async () => {
            const { redis } = await import('@/lib/db/redis')
            const { deleteSession } = await import('@/lib/auth/session')

            await deleteSession('test-session-id')

            expect(redis.del).toHaveBeenCalledWith('session:test-session-id')
        })
    })

    describe('refreshSession', () => {
        it('should refresh session TTL', async () => {
            const { redis } = await import('@/lib/db/redis')
            const { refreshSession } = await import('@/lib/auth/session')

            await refreshSession('test-session-id')

            expect(redis.expire).toHaveBeenCalledWith('session:test-session-id', 60 * 60 * 24 * 7)
        })
    })
})
