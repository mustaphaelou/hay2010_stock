import { randomBytes } from 'crypto'
import { redis } from '@/lib/db/redis'

const SESSION_PREFIX = 'session:'
const SESSION_TTL = 60 * 60 * 24 * 7 // 7 days in seconds

/**
 * Generate a cryptographically secure session ID
 * Uses Node.js crypto.randomBytes for security
 */
function generateSessionId(): string {
  return randomBytes(16).toString('hex')
}

export interface SessionData {
  userId: string
  email: string
  name: string
  role: string
  createdAt: number
}

export async function createSession(userId: string, email: string, name: string, role: string): Promise<string> {
  const sessionId = generateSessionId()
  const sessionData: SessionData = {
    userId,
    email,
    name,
    role,
    createdAt: Date.now()
  }

  await redis.setex(
    `${SESSION_PREFIX}${sessionId}`,
    SESSION_TTL,
    JSON.stringify(sessionData)
  )

  return sessionId
}

export async function getSession(sessionId: string): Promise<SessionData | null> {
  const data = await redis.get(`${SESSION_PREFIX}${sessionId}`)
  if (!data) return null

  try {
    return JSON.parse(data) as SessionData
  } catch {
    return null
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  await redis.del(`${SESSION_PREFIX}${sessionId}`)
}

export async function refreshSession(sessionId: string): Promise<void> {
  await redis.expire(`${SESSION_PREFIX}${sessionId}`, SESSION_TTL)
}
