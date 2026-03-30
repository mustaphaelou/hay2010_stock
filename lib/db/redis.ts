import Redis, { RedisOptions } from 'ioredis'

const globalForRedis = global as unknown as { redis: Redis }

const REDIS_MAX_RETRIES = 10
const REDIS_RETRY_DELAY_MAX = 2000

function createRedisClient(): Redis {
  const baseOptions: RedisOptions = {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    connectTimeout: 10000,
    commandTimeout: 5000,
    keepAlive: 30000,
    retryStrategy(times: number) {
      if (times > REDIS_MAX_RETRIES) {
        console.error('[Redis] Max retries reached, stopping connection attempts')
        return null
      }
      const delay = Math.min(times * 50, REDIS_RETRY_DELAY_MAX)
      console.log(`[Redis] Retry attempt ${times}, delay: ${delay}ms`)
      return delay
    },
  }

  const password = process.env.REDIS_PASSWORD
  if (password) {
    baseOptions.password = password
  }

  const url = process.env.REDIS_URL || 'redis://localhost:6379'
  return new Redis(url, baseOptions)
}

export const redis = globalForRedis.redis || createRedisClient()

let redisReady = false
let lastError: string | null = null

redis.on('error', (err: Error) => {
  lastError = err.message
  console.warn('[Redis] Connection error (Redis may not be running):', err.message)
})

redis.on('ready', () => {
  redisReady = true
  lastError = null
  console.log('[Redis] Connected and ready')
})

redis.on('close', () => {
  redisReady = false
  console.log('[Redis] Connection closed')
})

redis.on('reconnecting', () => {
  console.log('[Redis] Reconnecting...')
})

export function isRedisReady(): boolean {
  return redisReady
}

export function getRedisError(): string | null {
  return lastError
}

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis
