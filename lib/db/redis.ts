import Redis, { Cluster, RedisOptions } from 'ioredis'
import { createLogger } from '@/lib/logger'
import { getOptionalSecret } from '@/lib/config/env-validation'

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
