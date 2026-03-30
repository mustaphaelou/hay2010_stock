/**
 * Edge-Compatible Rate Limiting
 *
 * Uses in-memory Map for rate limiting in Edge Runtime.
 * Note: This is per-instance rate limiting. For distributed
 * rate limiting across multiple instances, consider using
 * a service like Upstash Redis which has Edge support.
 */

import { NextRequest, NextResponse } from 'next/server'

interface RateLimitConfig {
  requests: number
  window: number
  message?: string
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  '/api/auth/login': { requests: 10, window: 60, message: 'Too many login attempts. Please try again later.' },
  '/api/auth/register': { requests: 5, window: 300, message: 'Too many registration attempts. Please try again later.' },
  '/api/auth/forgot-password': { requests: 3, window: 300, message: 'Too many password reset requests. Please try again later.' },
  '/api/documents': { requests: 100, window: 60 },
  '/api/documents/generate-pdf': { requests: 20, window: 60, message: 'PDF generation rate limit exceeded.' },
  '/api/stock': { requests: 200, window: 60 },
  '/api/stock/movements': { requests: 100, window: 60 },
  '/api/products': { requests: 500, window: 60 },
  '/api/partners': { requests: 300, window: 60 },
  'default': { requests: 500, window: 60 },
}

const EXEMPT_PATHS = [
  '/api/health',
  '/_next',
  '/favicon.ico',
  '/public',
]

const rateLimitStore = new Map<string, RateLimitEntry>()

function getClientIdentifier(request: NextRequest): string {
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  if (cfConnectingIp) return cfConnectingIp

  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0].trim()

  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp

  return 'unknown'
}

function getRateLimitConfig(path: string): RateLimitConfig {
  if (RATE_LIMITS[path]) return RATE_LIMITS[path]

  for (const [key, config] of Object.entries(RATE_LIMITS)) {
    if (key !== 'default' && path.startsWith(key)) return config
  }

  return RATE_LIMITS.default
}

function isExemptPath(path: string): boolean {
  return EXEMPT_PATHS.some(exempt => path.startsWith(exempt))
}

function checkRateLimit(
  identifier: string,
  path: string,
  config: RateLimitConfig
): { allowed: boolean; limit: number; remaining: number; reset: number; retryAfter?: number } {
  const key = `${identifier}:${path}`
  const now = Date.now()
  const windowMs = config.window * 1000

  const entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetTime) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + windowMs,
    }
    rateLimitStore.set(key, newEntry)
    return {
      allowed: true,
      limit: config.requests,
      remaining: config.requests - 1,
      reset: newEntry.resetTime,
    }
  }

  entry.count++

  if (entry.count > config.requests) {
    return {
      allowed: false,
      limit: config.requests,
      remaining: 0,
      reset: entry.resetTime,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
    }
  }

  return {
    allowed: true,
    limit: config.requests,
    remaining: config.requests - entry.count,
    reset: entry.resetTime,
  }
}

function cleanupExpiredEntries(): void {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}

setInterval(cleanupExpiredEntries, 60000)

export async function rateLimitMiddleware(
  request: NextRequest
): Promise<NextResponse | null> {
  const path = new URL(request.url).pathname

  if (isExemptPath(path)) return null

  const identifier = getClientIdentifier(request)
  const config = getRateLimitConfig(path)
  const result = checkRateLimit(identifier, path, config)

  const headers = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  }

  if (!result.allowed) {
    return NextResponse.json(
      {
        error: config.message || 'Rate limit exceeded',
        retryAfter: result.retryAfter,
      },
      {
        status: 429,
        headers: {
          ...headers,
          'Retry-After': (result.retryAfter || config.window).toString(),
        },
      }
    )
  }

  return null
}

export function createRateLimitHeaders(
  identifier: string,
  path: string
): Record<string, string> {
  const config = getRateLimitConfig(path)
  return {
    'X-RateLimit-Limit': config.requests.toString(),
    'X-RateLimit-Window': config.window.toString(),
  }
}

export default rateLimitMiddleware
