import { redis, isRedisReady } from '@/lib/db/redis'

const LOCKOUT_PREFIX = 'lockout:'
const ATTEMPTS_PREFIX = 'attempts:'
const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60

interface LockoutResult {
  locked: boolean
  remaining: number
  unlockIn?: number
}

/**
 * Helper to safely execute Redis operations with graceful fallback
 * When Redis is unavailable, lockout features are disabled (fail-open)
 */
async function safeRedisOp<T>(op: () => Promise<T>, fallback: T): Promise<T> {
  try {
    if (!isRedisReady()) {
      // Redis not ready, return fallback (fail-open for lockout)
      return fallback
    }
    return await op()
  } catch (error) {
    console.warn('[Lockout] Redis operation failed, using fallback:', error)
    return fallback
  }
}

export async function recordFailedAttempt(email: string): Promise<LockoutResult> {
  return safeRedisOp(async () => {
    const attemptsKey = `${ATTEMPTS_PREFIX}${email}`
    const lockoutKey = `${LOCKOUT_PREFIX}${email}`

    const isLocked = await redis.exists(lockoutKey)
    if (isLocked) {
      const ttl = await redis.ttl(lockoutKey)
      return { locked: true, remaining: 0, unlockIn: ttl }
    }

    const attempts = await redis.incr(attemptsKey)
    if (attempts === 1) {
      await redis.expire(attemptsKey, LOCKOUT_DURATION)
    }

    if (attempts >= MAX_ATTEMPTS) {
      await redis.setex(lockoutKey, LOCKOUT_DURATION, '1')
      await redis.del(attemptsKey)
      return { locked: true, remaining: 0 }
    }

    return { locked: false, remaining: MAX_ATTEMPTS - attempts }
  }, { locked: false, remaining: MAX_ATTEMPTS }) // Fail-open: no lockout when Redis unavailable
}

export async function clearFailedAttempts(email: string): Promise<void> {
  await safeRedisOp(
    () => redis.del(`${ATTEMPTS_PREFIX}${email}`),
    undefined
  )
}

export async function isAccountLocked(email: string): Promise<boolean> {
  return safeRedisOp(
    () => redis.exists(`${LOCKOUT_PREFIX}${email}`).then(r => r === 1),
    false // Fail-open: account not locked when Redis unavailable
  )
}

export async function getLockoutTimeRemaining(email: string): Promise<number> {
  return safeRedisOp(
    () => redis.ttl(`${LOCKOUT_PREFIX}${email}`).then(ttl => Math.max(0, ttl)),
    0
  )
}

export async function getRemainingAttempts(email: string): Promise<number> {
  return safeRedisOp(async () => {
    const attempts = await redis.get(`${ATTEMPTS_PREFIX}${email}`)
    if (!attempts) return MAX_ATTEMPTS
    return Math.max(0, MAX_ATTEMPTS - parseInt(attempts, 10))
  }, MAX_ATTEMPTS)
}
