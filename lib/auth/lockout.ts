import { redis, isRedisReady } from '@/lib/db/redis'
import { createLogger } from '@/lib/logger'
import { getAuthConfig } from '@/lib/config/auth-config'
import { createHash } from 'node:crypto'

const log = createLogger('lockout')

const LOCKOUT_PREFIX = 'lockout:'
const ATTEMPTS_PREFIX = 'attempts:'
const IP_LOCKOUT_PREFIX = 'lockout:ip:'
const IP_ATTEMPTS_PREFIX = 'attempts:ip:'

interface LockoutResult {
  locked: boolean
  remaining: number
  unlockIn?: number
  error?: string
}

const LOCKOUT_SCRIPT = `
local lockoutKey = KEYS[1]
local attemptsKey = KEYS[2]
local lockoutDuration = tonumber(ARGV[1])
local maxAttempts = tonumber(ARGV[2])

local locked = redis.call('EXISTS', lockoutKey)
if locked == 1 then
  local ttl = redis.call('TTL', lockoutKey)
  return {1, 0, ttl}
end

local attempts = redis.call('INCR', attemptsKey)
if attempts == 1 then
  redis.call('EXPIRE', attemptsKey, lockoutDuration)
end

if attempts >= maxAttempts then
  redis.call('SETEX', lockoutKey, lockoutDuration, '1')
  redis.call('DEL', attemptsKey)
  return {1, 0, 0}
end

return {0, maxAttempts - attempts, 0}
`

let lockoutScriptSha: string | null = null

async function executeLockoutScript(
  lockoutKey: string,
  attemptsKey: string,
  maxAttempts: number,
  duration: number
): Promise<{ locked: boolean; remaining: number; unlockIn: number }> {
  if (!lockoutScriptSha) {
    lockoutScriptSha = await redis.script('LOAD', LOCKOUT_SCRIPT) as string
  }

  const result = await redis.evalsha(lockoutScriptSha, 2, lockoutKey, attemptsKey, String(duration), String(maxAttempts)) as [number, number, number]
  
  return {
    locked: result[0] === 1,
    remaining: result[1],
    unlockIn: result[2]
  }
}

async function safeRedisOp<T>(
  op: () => Promise<T>,
  fallback: T,
  operationName: string,
  failClosed: boolean = false
): Promise<T> {
  const { failClosed: lockoutFailClosed } = getAuthConfig().lockout
  try {
    if (!isRedisReady()) {
      log.warn({ operation: operationName, failClosed }, 'Redis not ready')
      if (failClosed && lockoutFailClosed) {
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
    if (failClosed && lockoutFailClosed) {
      throw new Error('Service temporarily unavailable')
    }
    return fallback
  }
}

export async function recordFailedAttempt(email: string): Promise<LockoutResult> {
  const failClosed = true
  const { maxAttempts, duration } = getAuthConfig().lockout
  const lockoutKey = `${LOCKOUT_PREFIX}${email}`
  const attemptsKey = `${ATTEMPTS_PREFIX}${email}`

  return safeRedisOp(async () => {
    const result = await executeLockoutScript(lockoutKey, attemptsKey, maxAttempts, duration)
    
    if (result.locked) {
      if (result.unlockIn > 0) {
        log.info({ email: email.substring(0, 3) + '***', ttl: result.unlockIn }, 'Account is locked')
      } else {
        log.warn({ email: email.substring(0, 3) + '***' }, 'Account locked due to too many attempts')
      }
    } else {
      log.info({ email: email.substring(0, 3) + '***', remaining: result.remaining }, 'Failed login attempt recorded')
    }
    
    return { locked: result.locked, remaining: result.remaining, unlockIn: result.unlockIn || undefined }
  }, { locked: false, remaining: maxAttempts, unlockIn: undefined }, 'recordFailedAttempt', failClosed)
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

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 16)
}

export async function recordFailedAttemptByIp(ip: string): Promise<LockoutResult> {
  const { ipMaxAttempts, duration } = getAuthConfig().lockout
  const ipHash = hashIp(ip)
  const lockoutKey = `${IP_LOCKOUT_PREFIX}${ipHash}`
  const attemptsKey = `${IP_ATTEMPTS_PREFIX}${ipHash}`

  return safeRedisOp(async () => {
    const result = await executeLockoutScript(lockoutKey, attemptsKey, ipMaxAttempts, duration)

    if (result.locked) {
      log.warn({ ipHash }, 'IP locked due to too many attempts')
    } else {
      log.info({ ipHash, remaining: result.remaining }, 'Failed login attempt recorded for IP')
    }

    return { locked: result.locked, remaining: result.remaining, unlockIn: result.unlockIn || undefined }
  }, { locked: false, remaining: ipMaxAttempts, unlockIn: undefined }, 'recordFailedAttemptByIp')
}

export async function isLockedByIp(ip: string): Promise<boolean> {
  const ipHash = hashIp(ip)
  return safeRedisOp(
    () => redis.exists(`${IP_LOCKOUT_PREFIX}${ipHash}`).then(r => r === 1),
    false,
    'isLockedByIp'
  )
}

export async function clearFailedAttemptsByIp(ip: string): Promise<void> {
  const ipHash = hashIp(ip)
  await safeRedisOp(
    () => redis.del(`${IP_ATTEMPTS_PREFIX}${ipHash}`),
    undefined,
    'clearFailedAttemptsByIp'
  )
}
