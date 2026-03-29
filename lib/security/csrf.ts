import { randomBytes } from 'crypto'
import { cookies } from 'next/headers'
import { redis } from '@/lib/db/redis'

const CSRF_TOKEN_EXPIRY = 3600 // 1 hour
const CSRF_PREFIX = 'csrf:'
const CSRF_COOKIE_NAME = 'csrf_token'

export async function generateCsrfToken(userId: string): Promise<{ token: string; cookieValue: string }> {
  const token = randomBytes(32).toString('hex')
  const cookieValue = randomBytes(32).toString('hex')
  const key = `${CSRF_PREFIX}${userId}:${token}`
  
  await redis.setex(key, CSRF_TOKEN_EXPIRY, cookieValue)
  
  return { token, cookieValue }
}

export async function validateCsrfToken(userId: string, token: string, cookieValue?: string): Promise<boolean> {
  if (!token || !userId) return false

  const key = `${CSRF_PREFIX}${userId}:${token}`
  const storedValue = await redis.get(key)

  if (!storedValue) return false

  await redis.del(key) // Single use token

  if (cookieValue && storedValue !== cookieValue) {
    return false
  }

  return true
}

export async function requireCsrfToken(userId: string, token: string, cookieValue?: string): Promise<void> {
  const valid = await validateCsrfToken(userId, token, cookieValue)
  if (!valid) {
    throw new Error('Invalid CSRF token')
  }
}

export function getCsrfTokenFromRequest(request: Request): string | null {
  const headerToken = request.headers.get('X-CSRF-Token')
  if (headerToken) return headerToken

  return null
}

export async function getCsrfTokenFromHeader(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('X-CSRF-Token')?.value || null
}

export async function setCsrfCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: CSRF_TOKEN_EXPIRY,
    path: '/',
  })
}

export async function getCsrfCookie(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(CSRF_COOKIE_NAME)?.value || null
}

export { CSRF_COOKIE_NAME }
