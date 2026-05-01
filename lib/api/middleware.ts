import { NextRequest, NextResponse } from 'next/server'
import { CacheService } from '@/lib/db/redis'
import { RateLimitError } from '@/lib/errors'

const TIER_LIMITS = {
  read: { requests: 120, window: 60 },
  write: { requests: 30, window: 60 },
} as const

export type RateLimitTier = keyof typeof TIER_LIMITS

export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number
}

function getTierConfig(tier: RateLimitTier): { requests: number; window: number } {
  return TIER_LIMITS[tier] ?? TIER_LIMITS.read
}

function buildRateLimitKey(keyId: string, tier: RateLimitTier, window: number): string {
  const slot = Math.floor(Date.now() / (window * 1000))
  return `ratelimit:api:${keyId}:${tier}:${slot}`
}

function buildRateLimitHeaders(limit: number, remaining: number, reset: number): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(Math.max(0, remaining)),
    'X-RateLimit-Reset': String(reset),
  }
}

export function withRateLimit(
  handler: (request: NextRequest, context: { keyId: string; tier: RateLimitTier }) => Promise<NextResponse>,
  tier: RateLimitTier
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest): Promise<NextResponse> => {
    const keyId = request.headers.get('x-api-key-id') || 'anonymous'
    const config = getTierConfig(tier)
    const key = buildRateLimitKey(keyId, tier, config.window)

    try {
      const count = await CacheService.increment(key, config.window)

      if (count > config.requests) {
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
              ...buildRateLimitHeaders(config.requests, 0, reset),
              'Retry-After': String(config.window),
            },
          }
        )
      }

      const remaining = config.requests - count
      const reset = Math.floor(Date.now() / 1000) + config.window

      const response = await handler(request, { keyId, tier })

      Object.entries(buildRateLimitHeaders(config.requests, remaining, reset)).forEach(([k, v]) => {
        response.headers.set(k, v)
      })

      return response
    } catch (error) {
      if (error instanceof RateLimitError) {
        const reset = Math.floor(Date.now() / 1000) + config.window
        return NextResponse.json(
          { error: error.message, code: 'RATE_LIMIT_EXCEEDED', retryAfter: config.window },
          {
            status: 429,
            headers: {
              ...buildRateLimitHeaders(config.requests, 0, reset),
              'Retry-After': String(config.window),
            },
          }
        )
      }
      throw error
    }
  }
}
