import Redis, { RedisOptions } from 'ioredis'
import { createLogger } from '@/lib/logger'

const log = createLogger('redis')

const globalForRedis = global as unknown as { 
  redis: Redis
  redisCache: Redis
  redisSession: Redis
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

  const password = process.env.REDIS_PASSWORD
  if (password) {
    baseOptions.password = password
  }

  const url = process.env.REDIS_URL || 'redis://localhost:6379'
  const client = new Redis(url, baseOptions)
  
  client.on('error', (err: Error) => {
    log.warn({ name, error: err.message }, 'Connection error')
  })

  client.on('ready', () => {
    log.info({ name }, 'Connected and ready')
  })

  client.on('close', () => {
    log.info({ name }, 'Connection closed')
  })

  client.on('reconnecting', () => {
    log.info({ name }, 'Reconnecting...')
  })

  return client
}

export const redis = globalForRedis.redis || createRedisClient('default')

let redisReady = false
let lastError: string | null = null

redis.on('error', (err: Error) => {
  lastError = err.message
})

redis.on('ready', () => {
  redisReady = true
  lastError = null
})

redis.on('close', () => {
  redisReady = false
})

export function isRedisReady(): boolean {
  return redisReady
}

export function getRedisError(): string | null {
  return lastError
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
