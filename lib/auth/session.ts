import { createLogger } from '@/lib/logger'
import { getAuthConfig } from '@/lib/config/auth-config'
import { randomBytesHex } from '@/lib/utils/crypto'

const SESSION_PREFIX = 'session:'

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
      log.warn('Redis not ready — session operations degraded')
      return null
    }

    await redis.ping()
    return redis
  } catch (error) {
    log.warn({ error }, 'Redis unavailable — session operations degraded')
    return null
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

  if (redisClient) {
    await redisClient.setex(
      `${SESSION_PREFIX}${sessionId}`,
      getAuthConfig().session.ttl,
      JSON.stringify(sessionData)
    )
  }

  return sessionId
}

export async function getSession(sessionId: string): Promise<SessionData | null> {
  const redisClient = await getRedis()
  if (!redisClient) return null

  const key = `${SESSION_PREFIX}${sessionId}`

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
  const redisClient = await getRedis()
  if (!redisClient) return

  const key = `${SESSION_PREFIX}${sessionId}`
  await redisClient.del(key)
}

export async function refreshSession(sessionId: string): Promise<void> {
  const redisClient = await getRedis()
  if (!redisClient) return

  const key = `${SESSION_PREFIX}${sessionId}`
  await redisClient.expire(key, getAuthConfig().session.ttl)
}
