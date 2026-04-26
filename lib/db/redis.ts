import Redis, { Cluster, RedisOptions } from 'ioredis'
import { createLogger } from '@/lib/logger'
import { getOptionalSecret } from '@/lib/config/env-validation'
import { randomBytes } from 'crypto'

const log = createLogger('redis')

const globalForRedis = global as unknown as {
  redis: Redis | Cluster | undefined
  redisSession: Redis | undefined
  redisReady: boolean | undefined
  redisSessionReady: boolean | undefined
  redisLastError: string | null
}

const REDIS_MAX_RETRIES = 10
const REDIS_RETRY_DELAY_MAX = 2000

const parseClusterNodes = (): string[] => {
  const clusterNodes = process.env.REDIS_CLUSTER_NODES
  if (clusterNodes) {
    return clusterNodes.split(',').map(node => node.trim())
  }
  return []
}

const clusterNodes = parseClusterNodes()

function createRedisCluster(): Cluster {
  const nodes = clusterNodes.map(node => {
    const [host, portStr] = node.split(':')
    return {
      host,
      port: parseInt(portStr || '6379', 10),
    }
  })

  const redisOptions: RedisOptions = {
    maxRetriesPerRequest: null,
    keepAlive: 30000,
    connectTimeout: 10000,
    commandTimeout: 5000,
  }

  const password = getOptionalSecret('REDIS_PASSWORD', 'REDIS_PASSWORD_FILE')
  if (password) {
    redisOptions.password = password
  }

  return new Cluster(nodes, {
    scaleReads: 'slave',
    maxRedirections: 16,
    retryDelayOnFailover: 100,
    retryDelayOnClusterDown: 100,
    enableReadyCheck: false,
    slotsRefreshTimeout: 1000,
    lazyConnect: true,
    clusterRetryStrategy: (times: number) => {
      if (times > 10) {
        log.error('Redis cluster connection failed after 10 retries')
        return null
      }
      const delay = Math.min(times * 100, 2000)
      log.debug({ attempt: times, delay }, 'Redis cluster retry')
      return delay
    },
    redisOptions,
  })
}

function createRedisSingle(name: string): Redis {
  const url = getOptionalSecret('REDIS_URL', 'REDIS_URL_FILE', 'redis://localhost:6379')
  const password = getOptionalSecret('REDIS_PASSWORD', 'REDIS_PASSWORD_FILE')

  const options: RedisOptions = {
    maxRetriesPerRequest: null,
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

  if (password) {
    options.password = password
  }

  return new Redis(url, options)
}

export const redis: Redis | Cluster = globalForRedis.redis ?? (clusterNodes.length > 0
  ? (() => {
      const cluster = createRedisCluster()
      globalForRedis.redis = cluster
      return cluster
    })()
  : (() => {
      const single = createRedisSingle('default')
      globalForRedis.redis = single
      return single
    })())

export const redisSession: Redis = globalForRedis.redisSession ?? (() => {
  const client = createRedisSingle('session')
  globalForRedis.redisSession = client
  return client
})()

if (typeof globalForRedis.redisReady === 'undefined') {
  globalForRedis.redisReady = false
  globalForRedis.redisLastError = null
}

redis.on('error', (err: Error) => {
  log.warn({ error: err.message }, 'Connection error')
  globalForRedis.redisLastError = err.message
})

redis.on('ready', () => {
  log.info('Connected and ready')
  globalForRedis.redisReady = true
  globalForRedis.redisLastError = null
})

redis.on('close', () => {
  log.info('Connection closed')
  globalForRedis.redisReady = false
})

redis.on('reconnecting', () => {
  log.info('Reconnecting...')
})

redisSession.on('error', (err: Error) => {
  log.warn({ error: err.message }, 'Session connection error')
})

redisSession.on('ready', () => {
  log.info('Session client ready')
  globalForRedis.redisSessionReady = true
})

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis
  globalForRedis.redisSession = redisSession
}

export function isRedisReady(): boolean {
  return globalForRedis.redisReady === true
}

export function getRedisError(): string | null {
  return globalForRedis.redisLastError || null
}

export function getClients() {
  return {
    default: redis,
    session: redisSession,
  }
}

export async function healthCheck(): Promise<{
  default: boolean
  session: boolean
}> {
  const results = await Promise.all([
    redis.ping().then(() => true).catch(() => false),
    redisSession.ping().then(() => true).catch(() => false),
  ])

  return {
    default: results[0],
    session: results[1],
  }
}

export const CacheKeys = {
  SESSION: 'session:',
  USER: 'user:',
  PRODUCT: 'product:',
  STOCK: 'stock:',
  PARTNER: 'partner:',
  DOCUMENT: 'document:',
  RATE_LIMIT: 'ratelimit:',
  LOCK: 'lock:',
  METRICS: 'metrics:',
} as const

export const CacheTTL = {
  SESSION: 7 * 24 * 60 * 60,
  USER: 60 * 60,
  PRODUCT: 15 * 60,
  STOCK: 60,
  PARTNER: 60 * 60,
  DOCUMENT: 5 * 60,
  RATE_LIMIT: 60,
  LOCK: 30,
  METRICS: 60,
} as const

export class CacheService {
  static async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key)
      if (!data) return null
      return JSON.parse(data) as T
    } catch (error) {
      log.error({ error, key }, 'Cache get error')
      return null
    }
  }

  static async set<T>(key: string, value: T, ttl: number = CacheTTL.PRODUCT): Promise<boolean> {
    try {
      await redis.setex(key, ttl, JSON.stringify(value))
      return true
    } catch (error) {
      log.error({ error, key }, 'Cache set error')
      return false
    }
  }

  static async delete(key: string): Promise<boolean> {
    try {
      await redis.del(key)
      return true
    } catch (error) {
      log.error({ error, key }, 'Cache delete error')
      return false
    }
  }

  static async deletePattern(pattern: string): Promise<number> {
    try {
      let count = 0
      let cursor = '0'

      do {
        const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
        cursor = nextCursor

        if (keys.length > 0) {
          await redis.del(...keys)
          count += keys.length
        }
      } while (cursor !== '0')

      return count
    } catch (error) {
      log.error({ error, pattern }, 'Cache delete pattern error')
      return 0
    }
  }

  static async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = CacheTTL.PRODUCT
  ): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const value = await fetcher()
    await this.set(key, value, ttl)
    return value
  }

  static async writeThrough<T>(
    key: string,
    value: T,
    writer: (value: T) => Promise<void>,
    ttl: number = CacheTTL.PRODUCT
  ): Promise<boolean> {
    try {
      await writer(value)
      await this.set(key, value, ttl)
      return true
    } catch (error) {
      log.error({ error, key }, 'Cache write-through error')
      return false
    }
  }

  static async acquireLock(
    key: string,
    ttl: number = CacheTTL.LOCK,
    retryDelay: number = 100,
    maxRetries: number = 10
  ): Promise<string | null> {
    const lockKey = `${CacheKeys.LOCK}${key}`
    const token = `${Date.now()}-${randomBytes(16).toString('hex')}`

    for (let i = 0; i < maxRetries; i++) {
      const result = await redis.set(lockKey, token, 'PX', ttl * 1000, 'NX')
      if (result === 'OK') {
        return token
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay))
    }

    return null
  }

  static async releaseLock(key: string, token: string): Promise<boolean> {
    const lockKey = `${CacheKeys.LOCK}${key}`
    const script = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`
    const result = await redis.eval(script, 1, lockKey, token)
    return result === 1
  }

  static async increment(key: string, ttl: number = CacheTTL.RATE_LIMIT): Promise<number> {
    const current = await redis.incr(key)
    if (current === 1) {
      await redis.expire(key, ttl)
    }
    return current
  }

  static async addToSortedSet(
    key: string,
    member: string,
    score: number
  ): Promise<void> {
    await redis.zadd(key, score, member)
  }

  static async getTopN(
    key: string,
    n: number,
    descending: boolean = true
  ): Promise<Array<{ member: string; score: number }>> {
    const results = descending
      ? await redis.zrevrange(key, 0, n - 1, 'WITHSCORES')
      : await redis.zrange(key, 0, n - 1, 'WITHSCORES')

    const items: Array<{ member: string; score: number }> = []
    for (let i = 0; i < results.length; i += 2) {
      items.push({
        member: results[i],
        score: parseFloat(results[i + 1]),
      })
    }
    return items
  }

  static async publish(channel: string, message: unknown): Promise<void> {
    await redis.publish(channel, JSON.stringify(message))
  }

  static subscribe(channel: string, callback: (message: unknown) => void): void {
    const subscriber = redis.duplicate()
    subscriber.subscribe(channel)
    subscriber.on('message', (_ch: string, message: string) => {
      try {
        callback(JSON.parse(message))
      } catch {
        callback(message)
      }
    })
  }
}

export async function checkRedisHealth(): Promise<{
  connected: boolean
  latency: number
  memory: {
    used: number
    peak: number
    total: number
  }
  cluster?: {
    state: string
    nodes: number
  }
}> {
  const result = {
    connected: false,
    latency: -1,
    memory: { used: 0, peak: 0, total: 0 },
    cluster: undefined as { state: string; nodes: number } | undefined,
  }

  try {
    const start = Date.now()
    await redis.ping()
    result.latency = Date.now() - start
    result.connected = true

    const info = await redis.info('memory')
    const usedMemory = info.match(/used_memory:(\d+)/)
    const peakMemory = info.match(/used_memory_peak:(\d+)/)
    const totalMemory = info.match(/total_system_memory:(\d+)/)

    if (usedMemory) result.memory.used = parseInt(usedMemory[1], 10)
    if (peakMemory) result.memory.peak = parseInt(peakMemory[1], 10)
    if (totalMemory) result.memory.total = parseInt(totalMemory[1], 10)

    if (clusterNodes.length > 0) {
      const clusterInfo = await redis.info('cluster')
      const clusterState = clusterInfo.match(/cluster_state:(\w+)/)
      const clusterNodesCount = clusterInfo.match(/cluster_known_nodes:(\d+)/)

      result.cluster = {
        state: clusterState ? clusterState[1] : 'unknown',
        nodes: clusterNodesCount ? parseInt(clusterNodesCount[1], 10) : 0,
      }
    }
  } catch (error) {
    log.error({ error }, 'Health check failed')
  }

  return result
}

export default redis
