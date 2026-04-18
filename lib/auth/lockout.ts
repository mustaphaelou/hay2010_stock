import { redis, isRedisReady } from '@/lib/db/redis'
import { createLogger } from '@/lib/logger'
import crypto from 'crypto'

const log = createLogger('lockout')

const LOCKOUT_PREFIX = 'lockout:'
const ATTEMPTS_PREFIX = 'attempts:'
const IP_LOCKOUT_PREFIX = 'lockout:ip:'
const IP_ATTEMPTS_PREFIX = 'attempts:ip:'
const MAX_ATTEMPTS = 5
const IP_MAX_ATTEMPTS = 20
const LOCKOUT_DURATION = 15 * 60

const FAIL_CLOSED_MODE = process.env.LOCKOUT_FAIL_CLOSED === 'true'

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

async function executeLockoutScript(email: string): Promise<{ locked: boolean; remaining: number; unlockIn: number }> {
  const lockoutKey = `${LOCKOUT_PREFIX}${email}`
  const attemptsKey = `${ATTEMPTS_PREFIX}${email}`

  if (!lockoutScriptSha) {
    lockoutScriptSha = await redis.script('LOAD', LOCKOUT_SCRIPT) as string
  }

  const result = await redis.evalsha(lockoutScriptSha, 2, lockoutKey, attemptsKey, String(LOCKOUT_DURATION), String(MAX_ATTEMPTS)) as [number, number, number]
  
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
    const result = await executeLockoutScript(email)
    
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
  }, { locked: false, remaining: MAX_ATTEMPTS, unlockIn: undefined }, 'recordFailedAttempt', failClosed)
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

function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16)
}

const IP_LOCKOUT_SCRIPT = `
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

let ipLockoutScriptSha: string | null = null

export async function recordFailedAttemptByIp(ip: string): Promise<LockoutResult> {
  const ipHash = hashIp(ip)
  const lockoutKey = `${IP_LOCKOUT_PREFIX}${ipHash}`
  const attemptsKey = `${IP_ATTEMPTS_PREFIX}${ipHash}`

  return safeRedisOp(async () => {
    if (!ipLockoutScriptSha) {
      ipLockoutScriptSha = await redis.script('LOAD', IP_LOCKOUT_SCRIPT) as string
    }

    const result = await redis.evalsha(ipLockoutScriptSha, 2, lockoutKey, attemptsKey, String(LOCKOUT_DURATION), String(IP_MAX_ATTEMPTS)) as [number, number, number]

    if (result[0] === 1) {
      log.warn({ ipHash }, 'IP locked due to too many attempts')
    } else {
      log.info({ ipHash, remaining: result[1] }, 'Failed login attempt recorded for IP')
    }

    return { locked: result[0] === 1, remaining: result[1], unlockIn: result[2] || undefined }
  }, { locked: false, remaining: IP_MAX_ATTEMPTS, unlockIn: undefined }, 'recordFailedAttemptByIp')
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
