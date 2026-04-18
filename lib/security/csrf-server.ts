import { randomBytes } from 'crypto'
import { cookies } from 'next/headers'
import { redis, isRedisReady } from '@/lib/db/redis'
import { getCurrentUser } from '@/app/actions/auth'

const CSRF_TOKEN_EXPIRY = 3600
const CSRF_PREFIX = 'csrf:'
const CSRF_COOKIE_NAME = 'csrf_token'

export interface CsrfTokens {
  token: string
  cookieValue: string
}

async function getCsrfKeyPrefix(): Promise<string> {
  const user = await getCurrentUser()
  if (user?.id) return user.id
  const cookieStore = await cookies()
  const ip = cookieStore.get('x-forwarded-for')?.value || 'unknown'
  return `anon:${ip}`
}

export async function generateCsrfToken(userId?: string): Promise<CsrfTokens> {
  if (!isRedisReady()) {
    throw new Error('CSRF service unavailable')
  }

  const uid = userId || await getCsrfKeyPrefix()
  const token = randomBytes(32).toString('hex')
  const cookieValue = randomBytes(32).toString('hex')
  const key = `${CSRF_PREFIX}${uid}:${token}`

  await redis.setex(key, CSRF_TOKEN_EXPIRY, cookieValue)

  return { token, cookieValue }
}

export async function validateCsrfToken(userId: string, token: string, cookieValue: string): Promise<boolean> {
  if (!token || !userId) return false

  if (!isRedisReady()) {
    throw new Error('CSRF service unavailable')
  }

  const key = `${CSRF_PREFIX}${userId}:${token}`
  const storedValue = await redis.get(key)

  if (!storedValue) return false

  await redis.del(key)

  if (storedValue !== cookieValue) {
    return false
  }

  return true
}

export async function requireCsrfToken(userId: string, token: string, cookieValue: string): Promise<void> {
  const valid = await validateCsrfToken(userId, token, cookieValue)
  if (!valid) {
    throw new Error('Invalid CSRF token')
  }
}

export async function validateCsrfTokenFromAction(userId: string, token?: string, cookieValue?: string): Promise<boolean> {
  if (!token) {
    return false
  }

  const cv = cookieValue || await getCsrfCookie() || ''
  return validateCsrfToken(userId, token, cv)
}

export async function setCsrfCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
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

export async function getCsrfTokenFromHeader(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(CSRF_COOKIE_NAME)?.value || null
}

export { CSRF_COOKIE_NAME, CSRF_TOKEN_EXPIRY }
