import { describe, it, expect, vi, beforeEach } from 'vitest'
import { recordFailedAttempt, clearFailedAttempts, isAccountLocked, getLockoutTimeRemaining, getRemainingAttempts } from '@/lib/auth/lockout'
import { redis, isRedisReady } from '@/lib/db/redis'

vi.mock('@/lib/db/redis', () => ({
  redis: {
    exists: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    get: vi.fn(),
    ttl: vi.fn(),
    script: vi.fn(),
    evalsha: vi.fn(),
  },
  isRedisReady: vi.fn(),
}))

describe('Account Lockout', () => {
  const testEmail = 'test@example.com'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isRedisReady).mockReturnValue(true)
    process.env.LOCKOUT_FAIL_CLOSED = 'false'
    // Mock script loading
    vi.mocked(redis.script).mockResolvedValue('script-sha')
  })

  describe('recordFailedAttempt', () => {
    it('should return remaining attempts on first failure', async () => {
      vi.mocked(redis.exists).mockResolvedValue(0)
      // Return format: [locked, remaining, ttl]
      vi.mocked(redis.evalsha).mockResolvedValue([0, 4, 0])

      const result = await recordFailedAttempt(testEmail)

      expect(result.locked).toBe(false)
      expect(result.remaining).toBe(4)
    })

    it('should lock account after 5 failed attempts', async () => {
      vi.mocked(redis.exists).mockResolvedValue(0)
      // Return format: [locked, remaining, ttl] - locked=1 means account is locked
      vi.mocked(redis.evalsha).mockResolvedValue([1, 0, 300])

      const result = await recordFailedAttempt(testEmail)

      expect(result.locked).toBe(true)
      expect(result.remaining).toBe(0)
    })

    it('should return locked status if already locked', async () => {
      vi.mocked(redis.exists).mockResolvedValue(1)
      vi.mocked(redis.evalsha).mockResolvedValue([1, 0, 300])

      const result = await recordFailedAttempt(testEmail)

      expect(result.locked).toBe(true)
      expect(result.unlockIn).toBe(300)
    })

    it('should return fallback when Redis is not ready', async () => {
      vi.mocked(isRedisReady).mockReturnValue(false)

      const result = await recordFailedAttempt(testEmail)

      expect(result.locked).toBe(false)
      expect(result.remaining).toBe(5)
    })
  })

  describe('clearFailedAttempts', () => {
    it('should clear attempts key', async () => {
      vi.mocked(redis.del).mockResolvedValue(1)

      await clearFailedAttempts(testEmail)

      expect(redis.del).toHaveBeenCalledWith(`attempts:${testEmail}`)
    })
  })

  describe('isAccountLocked', () => {
    it('should return true when locked', async () => {
      vi.mocked(redis.exists).mockResolvedValue(1)

      const result = await isAccountLocked(testEmail)

      expect(result).toBe(true)
    })

    it('should return false when not locked', async () => {
      vi.mocked(redis.exists).mockResolvedValue(0)

      const result = await isAccountLocked(testEmail)

      expect(result).toBe(false)
    })
  })

  describe('getLockoutTimeRemaining', () => {
    it('should return TTL when locked', async () => {
      vi.mocked(redis.ttl).mockResolvedValue(450)

      const result = await getLockoutTimeRemaining(testEmail)

      expect(result).toBe(450)
    })

    it('should return 0 when not locked', async () => {
      vi.mocked(redis.ttl).mockResolvedValue(-2)

      const result = await getLockoutTimeRemaining(testEmail)

      expect(result).toBe(0)
    })
  })

  describe('getRemainingAttempts', () => {
    it('should return max attempts when no attempts recorded', async () => {
      vi.mocked(redis.get).mockResolvedValue(null)

      const result = await getRemainingAttempts(testEmail)

      expect(result).toBe(5)
    })

    it('should return correct remaining after some attempts', async () => {
      vi.mocked(redis.get).mockResolvedValue('3')

      const result = await getRemainingAttempts(testEmail)

      expect(result).toBe(2)
    })
  })
})
