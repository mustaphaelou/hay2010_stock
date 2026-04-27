function randomBytesHex(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}
import { createLogger } from '@/lib/logger'

const SESSION_PREFIX = 'session:'
const SESSION_TTL = 60 * 60 * 24 * 7 // 7 days in seconds

const log = createLogger('session')

export interface SessionData {
  userId: string
  email: string
  name: string
  role: string
  createdAt: number
}

function generateSessionId(): string {
  return randomBytesHex(16)
}

async function getRedis() {
  try {
    const { redis, isRedisReady } = await import('@/lib/db/redis')

    if (!isRedisReady()) {
      throw new Error('Redis not initialized')
    }

    await redis.ping()
    return redis
  } catch (error) {
    log.error({ error }, 'Redis unavailable')
    throw new Error('Session service unavailable. Please try again later.')
  }
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

  const redisClient = await getRedis()
  
  if (!redisClient) {
    throw new Error('Session service unavailable. Please try again later.')
  }

  await redisClient.setex(
    `${SESSION_PREFIX}${sessionId}`,
    SESSION_TTL,
    JSON.stringify(sessionData)
  )

  return sessionId
}

export async function getSession(sessionId: string): Promise<SessionData | null> {
  const key = `${SESSION_PREFIX}${sessionId}`

  const redisClient = await getRedis()
  
  if (!redisClient) {
    throw new Error('Session service unavailable. Please try again later.')
  }

  const data = await redisClient.get(key)
  if (!data) return null
  
  try {
    return JSON.parse(data) as SessionData
  } catch {
    log.error({ key }, 'Failed to parse session data')
    return null
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  const key = `${SESSION_PREFIX}${sessionId}`

  const redisClient = await getRedis()
  
  if (!redisClient) {
    throw new Error('Session service unavailable. Please try again later.')
  }
  await redisClient.del(key)
}

export async function refreshSession(sessionId: string): Promise<void> {
  const key = `${SESSION_PREFIX}${sessionId}`

  const redisClient = await getRedis()

  if (!redisClient) {
    throw new Error('Session service unavailable. Please try again later.')
  }

  await redisClient.expire(key, SESSION_TTL)
}
