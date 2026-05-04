import { NextRequest, NextResponse } from 'next/server'
import { redis, CacheKeys } from '@/lib/db/redis'
import { createLogger } from '@/lib/logger'

const log = createLogger('rate-limit')

const TIER_LIMITS = {
  read: { requests: 120, window: 60 },
  write: { requests: 30, window: 60 },
} as const

export type RateLimitTier = keyof typeof TIER_LIMITS

interface CircuitBreakerState {
  failures: number
  lastFailureTime: number
  isOpen: boolean
  halfOpen: boolean
}

const circuitBreaker: CircuitBreakerState = {
  failures: 0,
  lastFailureTime: 0,
  isOpen: false,
  halfOpen: false,
}

const CIRCUIT_BREAKER_THRESHOLD = 5
const CIRCUIT_BREAKER_RESET_TIME = 60_000

function isCircuitOpen(): boolean {
  if (!circuitBreaker.isOpen) return false

  if (Date.now() - circuitBreaker.lastFailureTime > CIRCUIT_BREAKER_RESET_TIME) {
    log.info('Circuit breaker entering half-open state')
    circuitBreaker.halfOpen = true
    return false
  }

  return true
}

function recordFailure(): void {
  circuitBreaker.failures++
  circuitBreaker.lastFailureTime = Date.now()
  circuitBreaker.halfOpen = false

  if (circuitBreaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitBreaker.isOpen = true
    log.warn({ failures: circuitBreaker.failures }, 'Circuit breaker opened')
  }
}

function recordSuccess(): void {
  if (circuitBreaker.halfOpen) {
    log.info('Circuit breaker closed')
  }
  circuitBreaker.failures = 0
  circuitBreaker.isOpen = false
  circuitBreaker.halfOpen = false
}

interface TierConfig {
  requests: number
  window: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  reset: number
}

function buildKey(keyId: string, tier: RateLimitTier, window: number): string {
  const slot = Math.floor(Date.now() / (window * 1000))
  return `${CacheKeys.RATE_LIMIT}api:${keyId}:${tier}:${slot}`
}

function buildHeaders(limit: number, remaining: number, reset: number): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(Math.max(0, remaining)),
    'X-RateLimit-Reset': String(reset),
  }
}

function build429(config: TierConfig, tier: RateLimitTier): NextResponse {
  const reset = Math.floor(Date.now() / 1000) + config.window
  return NextResponse.json(
    {
      error: `Rate limit exceeded for ${tier} tier. Limit: ${config.requests} per ${config.window}s`,
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: config.window,
    },
    {
      status: 429,
      headers: {
        ...buildHeaders(config.requests, 0, reset),
        'Retry-After': String(config.window),
      },
    }
  )
}

async function checkRateLimit(
  keyId: string,
  tier: RateLimitTier,
  config: TierConfig
): Promise<RateLimitResult> {
  if (isCircuitOpen()) {
    log.warn('Circuit open, rejecting request')
    return { allowed: false, remaining: 0, reset: Math.floor(Date.now() / 1000) + config.window }
  }

  const key = buildKey(keyId, tier, config.window)

  try {
    const count = await redis.incr(key)
    if (count === 1) {
      await redis.expire(key, config.window)
    }

    recordSuccess()

    return {
      allowed: count <= config.requests,
      remaining: Math.max(0, config.requests - count),
      reset: Math.floor(Date.now() / 1000) + config.window,
    }
  } catch (error) {
    log.error({ error, keyId, tier }, 'Rate limit check failed')
    recordFailure()

    if (isCircuitOpen()) {
      log.warn('Circuit open, rejecting request')
      return { allowed: false, remaining: 0, reset: Math.floor(Date.now() / 1000) + config.window }
    }

    if (process.env.RATE_LIMIT_FAIL_CLOSED === 'true') {
      log.warn('Fail-closed: rejecting request due to Redis error')
      return { allowed: false, remaining: 0, reset: Math.floor(Date.now() / 1000) + config.window }
    }

    return { allowed: true, remaining: config.requests, reset: Math.floor(Date.now() / 1000) + config.window }
  }
}

export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  tier: RateLimitTier
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest): Promise<NextResponse> => {
    const keyId = request.headers.get('x-api-key-id') || 'anonymous'
    const config = TIER_LIMITS[tier] ?? TIER_LIMITS.read

    const result = await checkRateLimit(keyId, tier, config)

    if (!result.allowed) {
      return build429(config, tier)
    }

    const response = await handler(request)

    Object.entries(buildHeaders(config.requests, result.remaining, result.reset)).forEach(([k, v]) => {
      response.headers.set(k, v)
    })

    return response
  }
}

export { TIER_LIMITS }
