/**
 * Redis Cluster Configuration
 * 
 * This module provides Redis cluster support with automatic failover,
 * connection pooling, and distributed caching capabilities.
 */

import Redis, { Cluster, RedisOptions } from 'ioredis'

// Configuration types
interface RedisClusterConfig {
  nodes: string[]
  maxRetriesPerRequest: number
  enableReadyCheck: boolean
  scaleReads: 'master' | 'slave' | 'all'
  lazyConnect: boolean
  keepAlive: number
  connectTimeout: number
  commandTimeout: number
  password?: string
}

// Parse Redis cluster nodes from environment
const parseClusterNodes = (): string[] => {
    const clusterNodes = process.env.REDIS_CLUSTER_NODES
    if (clusterNodes) {
        return clusterNodes.split(',').map(node => node.trim())
    }
    return []
}

// Default configuration
const config: RedisClusterConfig = {
  nodes: parseClusterNodes(),
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,
  scaleReads: 'slave',
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
  password: process.env.REDIS_PASSWORD || undefined,
}

// Global type for hot-reload prevention
const globalForRedis = global as unknown as {
    redisCluster: Cluster | undefined
    redisSingle: Redis | undefined
}

/**
 * Create Redis cluster client
 */
function createRedisCluster(): Cluster {
  const nodes = config.nodes.map(node => {
    const [host, portStr] = node.split(':')
    return {
      host,
      port: parseInt(portStr || '6379', 10),
    }
  })

  const redisOptions: RedisOptions = {
    maxRetriesPerRequest: config.maxRetriesPerRequest,
    keepAlive: config.keepAlive,
    connectTimeout: config.connectTimeout,
    commandTimeout: config.commandTimeout,
  }
  
  if (config.password) {
    redisOptions.password = config.password
  }

	return new Cluster(nodes, {
    scaleReads: config.scaleReads,
    maxRedirections: 16,
    retryDelayOnFailover: 100,
    retryDelayOnClusterDown: 100,
    enableReadyCheck: config.enableReadyCheck,
    slotsRefreshTimeout: 1000,
    lazyConnect: config.lazyConnect,
    clusterRetryStrategy: (times: number) => {
      if (times > 10) {
        console.error('Redis cluster connection failed after 10 retries')
        return null
      }
      const delay = Math.min(times * 100, 2000)
      console.log(`Redis cluster retry attempt ${times}, delay: ${delay}ms`)
      return delay
    },
    redisOptions,
  })
}

/**
 * Create single Redis client (fallback for development)
 */
function createRedisSingle(): Redis {
  const url = process.env.REDIS_URL || 'redis://localhost:6379'
  const password = process.env.REDIS_PASSWORD
  
	const options: RedisOptions = {
		maxRetriesPerRequest: config.maxRetriesPerRequest,
		lazyConnect: config.lazyConnect,
		keepAlive: config.keepAlive,
		connectTimeout: config.connectTimeout,
		commandTimeout: config.commandTimeout,
		retryStrategy: (times: number) => {
			if (times > 10) {
				console.error('[Redis] Connection failed after 10 retries')
				return null
			}
			return Math.min(times * 50, 2000)
		},
	}

	if (password) {
		options.password = password
	}

	return new Redis(url, options)
}

/**
 * Redis client - uses cluster if configured, otherwise single instance
 */
export const redis: Redis | Cluster = globalForRedis.redisCluster ?? globalForRedis.redisSingle ?? (
    config.nodes.length > 0
        ? (() => {
            const cluster = createRedisCluster()
            globalForRedis.redisCluster = cluster
            return cluster
        })()
        : (() => {
            const single = createRedisSingle()
            globalForRedis.redisSingle = single
            return single
        })()
)

// Prevent multiple instances in development
if (process.env.NODE_ENV !== 'production') {
    if (config.nodes.length > 0) {
        globalForRedis.redisCluster = redis as Cluster
    } else {
        globalForRedis.redisSingle = redis as Redis
    }
}

// Error handling
redis.on('error', (err: Error) => {
    console.error('[Redis] Connection error:', err.message)
})

redis.on('connect', () => {
    console.log('[Redis] Connected successfully')
})

redis.on('ready', () => {
    console.log('[Redis] Ready to accept commands')
})

redis.on('close', () => {
    console.log('[Redis] Connection closed')
})

redis.on('reconnecting', () => {
    console.log('[Redis] Reconnecting...')
})

/**
 * Cache key prefixes for different data types
 */
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

/**
 * Default TTL values in seconds
 */
export const CacheTTL = {
    SESSION: 7 * 24 * 60 * 60, // 7 days
    USER: 60 * 60, // 1 hour
    PRODUCT: 15 * 60, // 15 minutes
    STOCK: 60, // 1 minute
    PARTNER: 60 * 60, // 1 hour
    DOCUMENT: 5 * 60, // 5 minutes
    RATE_LIMIT: 60, // 1 minute
    LOCK: 30, // 30 seconds
    METRICS: 60, // 1 minute
} as const

/**
 * Cache service with advanced features
 */
export class CacheService {
    /**
     * Get value from cache
     */
    static async get<T>(key: string): Promise<T | null> {
        try {
            const data = await redis.get(key)
            if (!data) return null
            return JSON.parse(data) as T
        } catch (error) {
            console.error(`[Cache] Get error for key ${key}:`, error)
            return null
        }
    }

    /**
     * Set value in cache with TTL
     */
    static async set<T>(key: string, value: T, ttl: number = CacheTTL.PRODUCT): Promise<boolean> {
        try {
            await redis.setex(key, ttl, JSON.stringify(value))
            return true
        } catch (error) {
            console.error(`[Cache] Set error for key ${key}:`, error)
            return false
        }
    }

    /**
     * Delete value from cache
     */
    static async delete(key: string): Promise<boolean> {
        try {
            await redis.del(key)
            return true
        } catch (error) {
            console.error(`[Cache] Delete error for key ${key}:`, error)
            return false
        }
    }

    /**
     * Delete multiple keys matching pattern
     * Uses SCAN instead of KEYS for production safety
     */
    static async deletePattern(pattern: string): Promise<number> {
        try {
            let count = 0
            let cursor = '0'

            do {
                // Use SCAN with COUNT to limit batch size
                const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
                cursor = nextCursor

                if (keys.length > 0) {
                    await redis.del(...keys)
                    count += keys.length
                }
            } while (cursor !== '0')

            return count
        } catch (error) {
            console.error(`[Cache] Delete pattern error for ${pattern}:`, error)
            return 0
        }
    }

    /**
     * Get or set pattern (cache-aside)
     */
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

    /**
     * Write-through cache pattern
     */
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
            console.error(`[Cache] Write-through error for key ${key}:`, error)
            return false
        }
    }

    /**
     * Acquire distributed lock
     */
    static async acquireLock(
        key: string,
        ttl: number = CacheTTL.LOCK,
        retryDelay: number = 100,
        maxRetries: number = 10
    ): Promise<string | null> {
        const lockKey = `${CacheKeys.LOCK}${key}`
        const token = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        for (let i = 0; i < maxRetries; i++) {
            const result = await redis.set(lockKey, token, 'PX', ttl * 1000, 'NX')
            if (result === 'OK') {
                return token
            }
            await new Promise(resolve => setTimeout(resolve, retryDelay))
        }

        return null
    }

    /**
     * Release distributed lock
     */
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

    /**
     * Increment counter with TTL
     */
    static async increment(key: string, ttl: number = CacheTTL.RATE_LIMIT): Promise<number> {
        const current = await redis.incr(key)
        if (current === 1) {
            await redis.expire(key, ttl)
        }
        return current
    }

    /**
     * Add to sorted set (for leaderboards/rankings)
     */
    static async addToSortedSet(
        key: string,
        member: string,
        score: number
    ): Promise<void> {
        await redis.zadd(key, score, member)
    }

    /**
     * Get top N from sorted set
     */
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

    /**
     * Publish event to channel
     */
    static async publish(channel: string, message: unknown): Promise<void> {
        await redis.publish(channel, JSON.stringify(message))
    }

    /**
     * Subscribe to channel
     */
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

/**
 * Health check for Redis
 */
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
        // Check connection and latency
        const start = Date.now()
        await redis.ping()
        result.latency = Date.now() - start
        result.connected = true

        // Get memory info
        const info = await redis.info('memory')
        const usedMemory = info.match(/used_memory:(\d+)/)
        const peakMemory = info.match(/used_memory_peak:(\d+)/)
        const totalMemory = info.match(/total_system_memory:(\d+)/)

        if (usedMemory) result.memory.used = parseInt(usedMemory[1], 10)
        if (peakMemory) result.memory.peak = parseInt(peakMemory[1], 10)
        if (totalMemory) result.memory.total = parseInt(totalMemory[1], 10)

        // Get cluster info if applicable
        if (config.nodes.length > 0) {
            const clusterInfo = await redis.info('cluster')
            const clusterState = clusterInfo.match(/cluster_state:(\w+)/)
            const clusterNodes = clusterInfo.match(/cluster_known_nodes:(\d+)/)

            result.cluster = {
                state: clusterState ? clusterState[1] : 'unknown',
                nodes: clusterNodes ? parseInt(clusterNodes[1], 10) : 0,
            }
        }
    } catch (error) {
        console.error('[Redis] Health check failed:', error)
    }

    return result
}

export default redis
