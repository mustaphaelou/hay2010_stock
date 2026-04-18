import Redis, { RedisOptions } from 'ioredis'
import { createLogger } from '@/lib/logger'
import { getOptionalSecret } from '@/lib/config/env-validation'

const log = createLogger('redis')

const globalForRedis = global as unknown as {
  redis: Redis
  redisCache: Redis
  redisSession: Redis
  redisReady: boolean
  redisLastError: string | null
}

const REDIS_MAX_RETRIES = 10
const REDIS_RETRY_DELAY_MAX = 2000

function createRedisClient(name: string): Redis {
  const baseOptions: RedisOptions = {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    connectTimeout: 10000,
    commandTimeout: 5000,
    keepAlive: 30000,
    enableReadyCheck: true,
    enableOfflineQueue: true,
    retryStrategy(times: number) {
      if (times > REDIS_MAX_RETRIES) {
        log.error({ name, times }, 'Max retries reached, stopping connection attempts')
        return null
      }
      const delay = Math.min(times * 50, REDIS_RETRY_DELAY_MAX)
      log.info({ name, times, delay }, 'Retry attempt')
      return delay
    },
  }

  const password = getOptionalSecret('REDIS_PASSWORD', 'REDIS_PASSWORD_FILE')
  if (password) {
    baseOptions.password = password
  }

  const url = getOptionalSecret('REDIS_URL', 'REDIS_URL_FILE', 'redis://localhost:6379')
  const client = new Redis(url, baseOptions)

  client.on('error', (err: Error) => {
    log.warn({ name, error: err.message }, 'Connection error')
    globalForRedis.redisLastError = err.message
  })

  client.on('ready', () => {
    log.info({ name }, 'Connected and ready')
    globalForRedis.redisReady = true
    globalForRedis.redisLastError = null
  })

  client.on('close', () => {
    log.info({ name }, 'Connection closed')
    globalForRedis.redisReady = false
  })

  return client
}

export const redis = globalForRedis.redis || createRedisClient('default')

// Initialize global state if not already set
if (typeof globalForRedis.redisReady === 'undefined') {
  globalForRedis.redisReady = false
  globalForRedis.redisLastError = null
}

export function isRedisReady(): boolean {
  return globalForRedis.redisReady === true
}

export function getRedisError(): string | null {
  return globalForRedis.redisLastError || null
}

export const redisCache = globalForRedis.redisCache || createRedisClient('cache')
export const redisSession = globalForRedis.redisSession || createRedisClient('session')

export function getClients() {
  return {
    default: redis,
    cache: redisCache,
    session: redisSession,
  }
}

export async function healthCheck(): Promise<{ 
  default: boolean
  cache: boolean
  session: boolean 
}> {
  const results = await Promise.all([
    redis.ping().then(() => true).catch(() => false),
    redisCache.ping().then(() => true).catch(() => false),
    redisSession.ping().then(() => true).catch(() => false),
  ])

  return {
    default: results[0],
    cache: results[1],
    session: results[2],
  }
}

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis
  globalForRedis.redisCache = redisCache
  globalForRedis.redisSession = redisSession
}
