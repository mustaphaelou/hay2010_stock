import { randomBytes } from 'crypto'
import { redis } from '@/lib/db/redis'

const CSRF_TOKEN_EXPIRY = 3600 // 1 hour
const CSRF_PREFIX = 'csrf:'

export async function generateCsrfToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const key = `${CSRF_PREFIX}${userId}:${token}`
  await redis.setex(key, CSRF_TOKEN_EXPIRY, '1')
  return token
}

export async function validateCsrfToken(userId: string, token: string): Promise<boolean> {
  if (!token || !userId) return false
  
  const key = `${CSRF_PREFIX}${userId}:${token}`
  const exists = await redis.exists(key)
  
  if (exists) {
    await redis.del(key) // Single use token
  }
  
  return exists === 1
}

export async function requireCsrfToken(userId: string, token: string): Promise<void> {
  const valid = await validateCsrfToken(userId, token)
  if (!valid) {
    throw new Error('Invalid CSRF token')
  }
}

export function getCsrfTokenFromRequest(request: Request): string | null {
  // Check header first
  const headerToken = request.headers.get('X-CSRF-Token')
  if (headerToken) return headerToken
  
  // Check body for form submissions
  return null
}
