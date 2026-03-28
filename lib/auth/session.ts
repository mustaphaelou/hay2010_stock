import { randomBytes } from 'crypto'

const SESSION_PREFIX = 'session:'
const SESSION_TTL = 60 * 60 * 24 * 7 // 7 days in seconds

// In-memory session fallback for when Redis is unavailable
const memoryStore = new Map<string, { data: string; expiresAt: number }>()

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

/**
 * Try to get Redis client, returns null if unavailable
 */
async function getRedis() {
  try {
    const { redis } = await import('@/lib/db/redis')
    // Test connection with a ping
    await redis.ping()
    return redis
  } catch {
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
      SESSION_TTL,
      JSON.stringify(sessionData)
    )
  } else {
    // Fallback to in-memory store
    console.warn('[Session] Redis unavailable, using in-memory session store')
    memoryStore.set(`${SESSION_PREFIX}${sessionId}`, {
      data: JSON.stringify(sessionData),
      expiresAt: Date.now() + SESSION_TTL * 1000
    })
  }

  return sessionId
}

export async function getSession(sessionId: string): Promise<SessionData | null> {
  const key = `${SESSION_PREFIX}${sessionId}`
  
  const redisClient = await getRedis()
  
  if (redisClient) {
    const data = await redisClient.get(key)
    if (!data) return null
    try {
      return JSON.parse(data) as SessionData
    } catch {
      return null
    }
  } else {
    // Fallback to in-memory store
    const entry = memoryStore.get(key)
    if (!entry) return null
    
    // Check expiration
    if (Date.now() > entry.expiresAt) {
      memoryStore.delete(key)
      return null
    }
    
    try {
      return JSON.parse(entry.data) as SessionData
    } catch {
      return null
    }
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  const key = `${SESSION_PREFIX}${sessionId}`
  
  const redisClient = await getRedis()
  
  if (redisClient) {
    await redisClient.del(key)
  } else {
    memoryStore.delete(key)
  }
}

export async function refreshSession(sessionId: string): Promise<void> {
  const key = `${SESSION_PREFIX}${sessionId}`
  
  const redisClient = await getRedis()
  
  if (redisClient) {
    await redisClient.expire(key, SESSION_TTL)
  } else {
    const entry = memoryStore.get(key)
    if (entry) {
      entry.expiresAt = Date.now() + SESSION_TTL * 1000
    }
  }
}
