/**
* Rate Limiting Middleware
*
* Provides tiered rate limiting for different endpoint types
* using Redis as the backing store.
* 
* Circuit breaker pattern prevents cascading failures when Redis is unavailable.
*/

import { NextRequest, NextResponse } from 'next/server'
import { redis, CacheKeys } from '@/lib/db/redis-cluster'
import { createLogger } from '@/lib/logger'

const log = createLogger('rate-limit')

// Circuit breaker state
interface CircuitBreakerState {
    failures: number
    lastFailureTime: number
    isOpen: boolean
}

const circuitBreaker: CircuitBreakerState = {
    failures: 0,
    lastFailureTime: 0,
    isOpen: false
}

const CIRCUIT_BREAKER_THRESHOLD = 5
const CIRCUIT_BREAKER_RESET_TIME = 60 * 1000 // 60 seconds

function isCircuitBreakerOpen(): boolean {
    if (!circuitBreaker.isOpen) {
        return false
    }
    
    const now = Date.now()
    if (now - circuitBreaker.lastFailureTime > CIRCUIT_BREAKER_RESET_TIME) {
        log.info('Circuit breaker entering half-open state')
        return false
    }
    
    return true
}

function recordCircuitBreakerFailure(): void {
    circuitBreaker.failures++
    circuitBreaker.lastFailureTime = Date.now()
    
    if (circuitBreaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
        circuitBreaker.isOpen = true
        log.warn({ failures: circuitBreaker.failures }, 'Circuit breaker opened due to repeated failures')
    }
}

function recordCircuitBreakerSuccess(): void {
    circuitBreaker.failures = 0
    circuitBreaker.isOpen = false
}

// Rate limit configuration by endpoint type
interface RateLimitConfig {
    requests: number
    window: number // in seconds
    message?: string
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
    // Authentication endpoints - strict limits
    '/api/auth/login': { requests: 10, window: 60, message: 'Too many login attempts. Please try again later.' },
    '/api/auth/register': { requests: 5, window: 300, message: 'Too many registration attempts. Please try again later.' },
    '/api/auth/forgot-password': { requests: 3, window: 300, message: 'Too many password reset requests. Please try again later.' },

    // Document operations - moderate limits
    '/api/documents': { requests: 100, window: 60 },
    '/api/documents/generate-pdf': { requests: 20, window: 60, message: 'PDF generation rate limit exceeded.' },

    // Stock operations - higher limits for real-time updates
    '/api/stock': { requests: 200, window: 60 },
    '/api/stock/movements': { requests: 100, window: 60 },

    // Product catalog - high limits for read-heavy operations
    '/api/products': { requests: 500, window: 60 },
    '/api/partners': { requests: 300, window: 60 },

    // Default limit for all other endpoints
    'default': { requests: 500, window: 60 },
}

// Exempt paths from rate limiting
const EXEMPT_PATHS = [
    '/api/health/public',
    '/_next',
    '/favicon.ico',
    '/public',
]

/**
 * Get client identifier for rate limiting
 * Uses X-Forwarded-For header or falls back to IP
 */
function getClientIdentifier(request: NextRequest): string {
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const cfConnectingIp = request.headers.get('cf-connecting-ip') // Cloudflare

    // Try different headers in order of preference
    if (cfConnectingIp) {
        return cfConnectingIp
    }

    if (forwardedFor) {
        // X-Forwarded-For can contain multiple IPs, use the first one
        return forwardedFor.split(',')[0].trim()
    }

    if (realIp) {
        return realIp
    }

    // Fallback to a default identifier
    return 'unknown'
}

/**
 * Get rate limit config for a path
 */
function getRateLimitConfig(path: string): RateLimitConfig {
    // Check for exact match first
    if (RATE_LIMITS[path]) {
        return RATE_LIMITS[path]
    }

    // Check for prefix match
    for (const [key, config] of Object.entries(RATE_LIMITS)) {
        if (key !== 'default' && path.startsWith(key)) {
            return config
        }
    }

    return RATE_LIMITS.default
}

/**
 * Check if path is exempt from rate limiting
 */
function isExemptPath(path: string): boolean {
    return EXEMPT_PATHS.some(exempt => path.startsWith(exempt))
}

/**
 * Rate limit result
 */
interface RateLimitResult {
    allowed: boolean
    limit: number
    remaining: number
    reset: number
    retryAfter?: number
}

/**
 * Check rate limit using sliding window algorithm
 */
async function checkRateLimit(
    identifier: string,
    path: string,
    config: RateLimitConfig
): Promise<RateLimitResult> {
    const key = `${CacheKeys.RATE_LIMIT}${identifier}:${path}`
    const now = Date.now()
    const windowStart = now - config.window * 1000

    try {
        // Use Redis transaction for atomic operations
        const multi = redis.multi()

        // Remove old entries outside the window
        multi.zremrangebyscore(key, 0, windowStart)

        // Add current request
        multi.zadd(key, now, `${now}-${Math.random().toString(36).substr(2, 9)}`)

        // Get count of requests in window
        multi.zcard(key)

        // Set expiry
        multi.expire(key, config.window)

        const results = await multi.exec()

        // Get the count from the zcard result (index 2)
        const count = results?.[2]?.[1] as number || 0

        const remaining = Math.max(0, config.requests - count)
        const reset = now + config.window * 1000

        return {
            allowed: count <= config.requests,
            limit: config.requests,
            remaining,
            reset,
            retryAfter: count > config.requests ? config.window : undefined,
        }
    } catch (error) {
        log.error({ error, identifier, path }, 'Error checking rate limit')
        recordCircuitBreakerFailure()
        
        if (isCircuitBreakerOpen()) {
            log.warn('Circuit breaker is open, rejecting request')
            return {
                allowed: false,
                limit: config.requests,
                remaining: 0,
                reset: now + config.window * 1000,
                retryAfter: Math.ceil((circuitBreaker.lastFailureTime + CIRCUIT_BREAKER_RESET_TIME - now) / 1000)
            }
        }
        
        return {
            allowed: true,
            limit: config.requests,
            remaining: config.requests,
            reset: now + config.window * 1000,
        }
    }
    
    recordCircuitBreakerSuccess()
}

/**
 * Simple rate limit check using increment (faster but less accurate)
 */
async function checkRateLimitSimple(
    identifier: string,
    path: string,
    config: RateLimitConfig
): Promise<RateLimitResult> {
    const key = `${CacheKeys.RATE_LIMIT}${identifier}:${path}`
    const now = Date.now()

    try {
        const current = await redis.incr(key)

        if (current === 1) {
            await redis.expire(key, config.window)
        }

        const ttl = await redis.ttl(key)
        const remaining = Math.max(0, config.requests - current)

        return {
            allowed: current <= config.requests,
            limit: config.requests,
            remaining,
            reset: now + ttl * 1000,
            retryAfter: current > config.requests ? ttl : undefined,
        }
    } catch (error) {
        log.error({ error, identifier, path }, 'Error checking rate limit (simple)')
        recordCircuitBreakerFailure()
        
        if (isCircuitBreakerOpen()) {
            log.warn('Circuit breaker is open, rejecting request')
            return {
                allowed: false,
                limit: config.requests,
                remaining: 0,
                reset: now + config.window * 1000,
                retryAfter: Math.ceil((circuitBreaker.lastFailureTime + CIRCUIT_BREAKER_RESET_TIME - now) / 1000)
            }
        }
        
        return {
            allowed: true,
            limit: config.requests,
            remaining: config.requests,
            reset: now + config.window * 1000,
        }
    }
    
    recordCircuitBreakerSuccess()
}

/**
 * Rate limiting middleware
 */
export async function rateLimitMiddleware(
    request: NextRequest
): Promise<NextResponse | null> {
    const path = new URL(request.url).pathname

    // Skip rate limiting for exempt paths
    if (isExemptPath(path)) {
        return null
    }

    // Get client identifier
    const identifier = getClientIdentifier(request)

    // Get rate limit config for this path
    const config = getRateLimitConfig(path)

    // Check rate limit (use simple for non-critical paths)
    const isCriticalPath = path.includes('/auth/') || path.includes('/generate-pdf')
    const result = isCriticalPath
        ? await checkRateLimit(identifier, path, config)
        : await checkRateLimitSimple(identifier, path, config)

    // Set rate limit headers
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

    // Continue to next handler
    return null
}

/**
 * Rate limit decorator for server actions
 */
export function withRateLimit<T extends (...args: unknown[]) => Promise<unknown>>(
    action: T,
    config: RateLimitConfig
): T {
    return (async (...args: unknown[]) => {
        // For server actions, we use a simplified rate limit check
        // The identifier would typically come from the session
        const key = `action:${action.name}`

        try {
            const current = await redis.incr(key)
            if (current === 1) {
                await redis.expire(key, config.window)
            }

            if (current > config.requests) {
                throw new Error(config.message || 'Rate limit exceeded')
            }
        } catch (error) {
            if (error instanceof Error && error.message.includes('Rate limit')) {
                throw error
            }
		// Log but don't block on Redis errors
		log.error({ error }, 'Rate limit check error')
        }

        return action(...args)
    }) as T
}

/**
 * Create rate limit headers for successful responses
 */
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
