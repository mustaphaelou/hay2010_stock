import { randomBytes } from 'crypto'
import { cookies } from 'next/headers'
import { redis, isRedisReady } from '@/lib/db/redis'
import { createLogger } from '@/lib/logger'

const log = createLogger('csrf-server')

const CSRF_TOKEN_EXPIRY = 3600
const CSRF_PREFIX = 'csrf:'
const CSRF_COOKIE_NAME = 'csrf_token'

/**
 * Standard anonymous user ID used for CSRF key generation and validation.
 * This MUST be consistent between token generation and token validation
 * to ensure the Redis key prefix matches.
 */
const ANONYMOUS_USER_ID = 'anonymous'

/**
 * Resolve the userId for CSRF token operations.
 *
 * For authenticated requests: returns the user's ID from the JWT.
 * For unauthenticated requests (e.g., login page): returns 'anonymous'.
 *
 * This replaces the previous getCsrfKeyPrefix() which used IP-based keys
 * that never matched the hardcoded 'anonymous' used during validation.
 */
async function resolveCsrfUserId(): Promise<string> {
  try {
    // Import lazily to avoid circular dependency at module load time
    const { verifyToken } = await import('@/lib/auth/jwt')
    const cookieStore = await cookies()
    const authToken = cookieStore.get('auth_token')?.value

    if (authToken) {
      const payload = await verifyToken(authToken)
      if (payload?.userId) {
        return payload.userId
      }
    }
  } catch {
    // Not authenticated or token invalid — fall through to anonymous
  }

  return ANONYMOUS_USER_ID
}

export interface CsrfTokens {
  token: string
  cookieValue: string
}

/**
 * Generate a new CSRF token pair (token + cookie value).
 *
 * The token is stored in Redis under `csrf:{userId}:{token}` with the
 * cookieValue as the value. The cookieValue is set as a browser cookie
 * and must match on validation (double-submit cookie pattern).
 *
 * @param userId - Optional user ID. If omitted, resolves automatically:
 *   - Authenticated users → their user ID
 *   - Unauthenticated users → 'anonymous'
 */
export async function generateCsrfToken(userId?: string): Promise<CsrfTokens> {
  if (!isRedisReady()) {
    log.warn('Redis unavailable for CSRF token generation — using stateless fallback')
    // Stateless fallback: sign a HMAC token that can be validated without Redis
    return generateStatelessCsrfToken(userId || ANONYMOUS_USER_ID)
  }

  const uid = userId || await resolveCsrfUserId()
  const token = randomBytes(32).toString('hex')
  const cookieValue = randomBytes(32).toString('hex')
  const key = `${CSRF_PREFIX}${uid}:${token}`

  await redis.setex(key, CSRF_TOKEN_EXPIRY, cookieValue)

  log.debug({ uid, keyPrefix: `${CSRF_PREFIX}${uid}:` }, 'CSRF token generated')

  return { token, cookieValue }
}

/**
 * Validate a CSRF token using the double-submit cookie pattern.
 *
 * Looks up the token in Redis, verifies the cookie value matches,
 * and consumes the token (single-use). After successful validation,
 * a new token is automatically generated and the CSRF cookie is refreshed
 * so the client always has a fresh token for the next request.
 *
 * @param userId - The user ID used during token generation. Must match
 *   the ID used when the token was created (use 'anonymous' for login).
 * @param token - The CSRF token from the request body/form.
 * @param cookieValue - The CSRF cookie value from the request cookies.
 * @returns true if valid, false otherwise.
 */
export async function validateCsrfToken(userId: string, token: string, cookieValue: string): Promise<boolean> {
  if (!token || !userId) return false

  // Try Redis-backed validation first
  if (isRedisReady()) {
    const key = `${CSRF_PREFIX}${userId}:${token}`
    const storedValue = await redis.get(key)

    if (!storedValue) {
      log.warn({ userId, key }, 'CSRF token not found in Redis (expired or never generated)')
      return false
    }

    // Delete token immediately (single-use)
    await redis.del(key)

    if (storedValue !== cookieValue) {
      log.warn({ userId }, 'CSRF cookie value mismatch — possible tampering')
      return false
    }

    // Token is valid — generate a replacement token for the next request
    await rotateCsrfToken(userId)

    return true
  }

  // Fallback: stateless HMAC validation
  return validateStatelessCsrfToken(userId, token, cookieValue)
}

/**
 * Rotate the CSRF token after successful validation.
 * Generates a new token and sets the new cookie value.
 */
async function rotateCsrfToken(userId: string): Promise<void> {
  try {
    const { cookieValue: newCookie } = await generateCsrfToken(userId)
    await setCsrfCookie(newCookie)
    log.debug({ userId }, 'CSRF token rotated after validation')
  } catch (error) {
    // Non-fatal: the client can still fetch a fresh token on the next attempt
    log.warn({ userId, error }, 'Failed to rotate CSRF token after validation')
  }
}

/**
 * Require a valid CSRF token, throwing an error if invalid.
 * Used by server actions that need to enforce CSRF protection.
 */
export async function requireCsrfToken(userId: string, token: string, cookieValue: string): Promise<void> {
  const valid = await validateCsrfToken(userId, token, cookieValue)
  if (!valid) {
    throw new Error('Invalid CSRF token')
  }
}

/**
 * Convenience function for server actions: validate CSRF token
 * with auto-detected userId and cookie value.
 */
export async function validateCsrfTokenFromAction(userId: string, token?: string, cookieValue?: string): Promise<boolean> {
  if (!token) {
    return false
  }

  const cv = cookieValue || await getCsrfCookie() || ''
  return validateCsrfToken(userId, token, cv)
}

/**
 * Set the CSRF cookie in the response.
 *
 * httpOnly is set to false so the cookie is accessible to both:
 * - Client-side JavaScript (for the CsrfProvider)
 * - Server-side cookie reads (for server action validation)
 *
 * The cookie value itself is a random hex string that only proves
 * the client received the Set-Cookie header — it contains no
 * sensitive data, so httpOnly=false is safe here.
 */
export async function setCsrfCookie(cookieValue: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(CSRF_COOKIE_NAME, cookieValue, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: CSRF_TOKEN_EXPIRY,
    path: '/',
  })
}

/**
 * Get the current CSRF cookie value from the request.
 */
export async function getCsrfCookie(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(CSRF_COOKIE_NAME)?.value || null
}

/**
 * Get the CSRF token from a header (alias for getCsrfCookie).
 */
export async function getCsrfTokenFromHeader(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(CSRF_COOKIE_NAME)?.value || null
}

// ─── Stateless fallback (when Redis is unavailable) ──────────────────────
// Uses HMAC-based tokens that can be validated without Redis.
// Security is reduced (tokens cannot be consumed on read), but this
// prevents login from being completely blocked during Redis outages.

import { createHmac, timingSafeEqual } from 'crypto'

function getHmacSecret(): string {
  const csrfSecret = process.env.CSRF_SECRET
  if (csrfSecret) return csrfSecret

  const jwtSecret = process.env.JWT_SECRET
  if (jwtSecret) {
    log.warn('CSRF_SECRET not set — falling back to JWT_SECRET. Set CSRF_SECRET for proper key separation.')
    return jwtSecret
  }

  throw new Error('CSRF_SECRET or JWT_SECRET is required for CSRF protection')
}

function generateStatelessCsrfToken(userId: string): CsrfTokens {
  const nonce = randomBytes(32).toString('hex')
  const timestamp = Math.floor(Date.now() / 1000).toString(36)
  const cookieValue = randomBytes(32).toString('hex')

  const hmac = createHmac('sha256', getHmacSecret())
    .update(`${userId}:${nonce}:${timestamp}:${cookieValue}`)
    .digest('hex')

  // Token format: nonce.timestamp.hmac
  const token = `${nonce}.${timestamp}.${hmac}`

  return { token, cookieValue }
}

function validateStatelessCsrfToken(userId: string, token: string, cookieValue: string): boolean {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false

    const [nonce, timestamp, hmac] = parts

    // Check token expiry (1 hour)
    const tokenTime = parseInt(timestamp, 36)
    const now = Math.floor(Date.now() / 1000)
    if (now - tokenTime > CSRF_TOKEN_EXPIRY) {
      log.warn({ userId }, 'Stateless CSRF token expired')
      return false
    }

    // Verify HMAC
    const expectedHmac = createHmac('sha256', getHmacSecret())
      .update(`${userId}:${nonce}:${timestamp}:${cookieValue}`)
      .digest('hex')

    if (hmac.length !== expectedHmac.length) return false

    const tokenBuffer = Buffer.from(hmac, 'hex')
    const expectedBuffer = Buffer.from(expectedHmac, 'hex')
    return timingSafeEqual(tokenBuffer, expectedBuffer)
  } catch (error) {
    log.warn({ userId, error }, 'Stateless CSRF token validation failed')
    return false
  }
}

export { CSRF_COOKIE_NAME, CSRF_TOKEN_EXPIRY, ANONYMOUS_USER_ID }
