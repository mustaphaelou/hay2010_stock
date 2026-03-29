import { redis } from '@/lib/db/redis'

const LOCKOUT_PREFIX = 'lockout:'
const ATTEMPTS_PREFIX = 'attempts:'
const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60

interface LockoutResult {
  locked: boolean
  remaining: number
  unlockIn?: number
}

export async function recordFailedAttempt(email: string): Promise<LockoutResult> {
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
}

export async function clearFailedAttempts(email: string): Promise<void> {
  await redis.del(`${ATTEMPTS_PREFIX}${email}`)
}

export async function isAccountLocked(email: string): Promise<boolean> {
  return redis.exists(`${LOCKOUT_PREFIX}${email}`)
}

export async function getLockoutTimeRemaining(email: string): Promise<number> {
  const ttl = await redis.ttl(`${LOCKOUT_PREFIX}${email}`)
  return Math.max(0, ttl)
}

export async function getRemainingAttempts(email: string): Promise<number> {
  const attempts = await redis.get(`${ATTEMPTS_PREFIX}${email}`)
  if (!attempts) return MAX_ATTEMPTS
  return Math.max(0, MAX_ATTEMPTS - parseInt(attempts, 10))
}
