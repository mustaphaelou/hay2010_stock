import { redis, isRedisReady } from '@/lib/db/redis'
import { createLogger } from '@/lib/logger'

const log = createLogger('lockout')

const LOCKOUT_PREFIX = 'lockout:'
const ATTEMPTS_PREFIX = 'attempts:'
const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60

const FAIL_CLOSED_MODE = process.env.LOCKOUT_FAIL_CLOSED === 'true'

interface LockoutResult {
  locked: boolean
  remaining: number
  unlockIn?: number
  error?: string
}

async function safeRedisOp<T>(
  op: () => Promise<T>,
  fallback: T,
  operationName: string,
  failClosed: boolean = false
): Promise<T> {
  try {
    if (!isRedisReady()) {
      log.warn({ operation: operationName, failClosed }, 'Redis not ready')
      if (failClosed && FAIL_CLOSED_MODE) {
        throw new Error('Service temporarily unavailable')
      }
      return fallback
    }
    return await op()
  } catch (error) {
    if (error instanceof Error && error.message === 'Service temporarily unavailable') {
      throw error
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    log.error({ operation: operationName, error: errorMessage }, 'Redis operation failed')
    if (failClosed && FAIL_CLOSED_MODE) {
      throw new Error('Service temporarily unavailable')
    }
    return fallback
  }
}

export async function recordFailedAttempt(email: string): Promise<LockoutResult> {
  const failClosed = true

  return safeRedisOp(async () => {
    const attemptsKey = `${ATTEMPTS_PREFIX}${email}`
    const lockoutKey = `${LOCKOUT_PREFIX}${email}`

    const isLocked = await redis.exists(lockoutKey)
    if (isLocked) {
      const ttl = await redis.ttl(lockoutKey)
      log.info({ email: email.substring(0, 3) + '***', ttl }, 'Account is locked')
      return { locked: true, remaining: 0, unlockIn: ttl }
    }

    const attempts = await redis.incr(attemptsKey)
    if (attempts === 1) {
      await redis.expire(attemptsKey, LOCKOUT_DURATION)
    }

    if (attempts >= MAX_ATTEMPTS) {
      await redis.setex(lockoutKey, LOCKOUT_DURATION, '1')
      await redis.del(attemptsKey)
      log.warn({ email: email.substring(0, 3) + '***' }, 'Account locked due to too many attempts')
      return { locked: true, remaining: 0 }
    }

    log.info({ email: email.substring(0, 3) + '***', attempts, remaining: MAX_ATTEMPTS - attempts }, 'Failed login attempt recorded')
    return { locked: false, remaining: MAX_ATTEMPTS - attempts }
  }, { locked: false, remaining: MAX_ATTEMPTS }, 'recordFailedAttempt', failClosed)
}

export async function clearFailedAttempts(email: string): Promise<void> {
  await safeRedisOp(
    () => redis.del(`${ATTEMPTS_PREFIX}${email}`),
    undefined,
    'clearFailedAttempts'
  )
}

export async function isAccountLocked(email: string): Promise<boolean> {
  return safeRedisOp(
    () => redis.exists(`${LOCKOUT_PREFIX}${email}`).then(r => r === 1),
    false,
    'isAccountLocked'
  )
}

export async function getLockoutTimeRemaining(email: string): Promise<number> {
  return safeRedisOp(
    () => redis.ttl(`${LOCKOUT_PREFIX}${email}`).then(ttl => Math.max(0, ttl)),
    0,
    'getLockoutTimeRemaining'
  )
}

export async function getRemainingAttempts(email: string): Promise<number> {
  return safeRedisOp(async () => {
    const attempts = await redis.get(`${ATTEMPTS_PREFIX}${email}`)
    if (!attempts) return MAX_ATTEMPTS
    return Math.max(0, MAX_ATTEMPTS - parseInt(attempts, 10))
  }, MAX_ATTEMPTS, 'getRemainingAttempts')
}
