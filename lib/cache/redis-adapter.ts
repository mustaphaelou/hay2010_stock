import { redis } from '@/lib/db/redis'
import { createLogger } from '@/lib/logger'
import { randomBytesHex } from '@/lib/utils/crypto'
import type { CacheAdapter } from './cache'

const log = createLogger('cache-redis')

const VERSION_KEY_PREFIX = 'cache:version:'
const DEFAULT_VERSION = '1'
const VERSION_CACHE_TTL_MS = 10_000
const LOCK_PREFIX = 'lock:'
const DEFAULT_LOCK_TTL = 30
const LOCK_RETRY_DELAY_MS = 100
const LOCK_MAX_RETRIES = 10

interface CachedVersion {
  value: string
  expiresAt: number
}

export class RedisCacheAdapter implements CacheAdapter {
  private static versionCache = new Map<string, CachedVersion>()

  private async getVersion(namespace: string): Promise<string> {
    const cached = RedisCacheAdapter.versionCache.get(namespace)
    if (cached && cached.expiresAt > Date.now()) return cached.value

    try {
      const key = `${VERSION_KEY_PREFIX}${namespace}`
      let version = await redis.get(key)

      if (!version) {
        version = DEFAULT_VERSION
        await redis.set(key, version)
      }

      RedisCacheAdapter.versionCache.set(namespace, { value: version, expiresAt: Date.now() + VERSION_CACHE_TTL_MS })
      return version
    } catch (error) {
      log.warn({ namespace, error }, 'Failed to get version, using default')
      return DEFAULT_VERSION
    }
  }

  private async incrementVersion(namespace: string): Promise<string> {
    try {
      const key = `${VERSION_KEY_PREFIX}${namespace}`
      const newVersion = await redis.incr(key)
      const versionStr = String(newVersion)

      RedisCacheAdapter.versionCache.set(namespace, { value: versionStr, expiresAt: Date.now() + VERSION_CACHE_TTL_MS })

      log.info({ namespace, version: versionStr }, 'Cache version incremented')
      return versionStr
    } catch (error) {
      log.error({ namespace, error }, 'Failed to increment version')
      throw error
    }
  }

  private async buildVersionedKey(namespace: string, key: string): Promise<string> {
    const version = await this.getVersion(namespace)
    return `${namespace}:v${version}:${key}`
  }

  async get<T>(namespace: string, key: string): Promise<T | null> {
    const fullKey = await this.buildVersionedKey(namespace, key)
    try {
      const data = await redis.get(fullKey)
      if (!data) return null
      return JSON.parse(data) as T
    } catch (error) {
      log.warn({ namespace, key, error }, 'Cache get error')
      return null
    }
  }

  async set<T>(namespace: string, key: string, value: T, ttl?: number): Promise<boolean> {
    const fullKey = await this.buildVersionedKey(namespace, key)
    try {
      await redis.setex(fullKey, ttl ?? 900, JSON.stringify(value))
      return true
    } catch (error) {
      log.warn({ namespace, key, error }, 'Cache set error')
      return false
    }
  }

  async delete(namespace: string, key: string): Promise<boolean> {
    const fullKey = await this.buildVersionedKey(namespace, key)
    try {
      await redis.del(fullKey)
      return true
    } catch (error) {
      log.warn({ namespace, key, error }, 'Cache delete error')
      return false
    }
  }

  async invalidateNamespace(namespace: string): Promise<void> {
    try {
      await this.incrementVersion(namespace)
      RedisCacheAdapter.versionCache.delete(namespace)
      log.info({ namespace }, 'Namespace invalidated')
    } catch (error) {
      log.warn({ namespace, error }, 'Failed to invalidate namespace')
    }
  }

  async getOrSet<T>(namespace: string, key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = await this.get<T>(namespace, key)
    if (cached !== null) return cached

    const value = await fetcher()
    await this.set(namespace, key, value, ttl)
    return value
  }

  async acquireLock(key: string, ttl?: number): Promise<string | null> {
    const lockKey = `${LOCK_PREFIX}${key}`
    const lockTTL = ttl ?? DEFAULT_LOCK_TTL
    const token = `${Date.now()}-${randomBytesHex(16)}`

    for (let i = 0; i < LOCK_MAX_RETRIES; i++) {
      try {
        const result = await redis.set(lockKey, token, 'PX', lockTTL * 1000, 'NX')
        if (result === 'OK') return token
      } catch (error) {
        log.warn({ error, key }, 'Lock acquire error, retrying')
      }
      await new Promise(resolve => setTimeout(resolve, LOCK_RETRY_DELAY_MS))
    }

    return null
  }

  async releaseLock(key: string, token: string): Promise<boolean> {
    const lockKey = `${LOCK_PREFIX}${key}`
    const script = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`
    try {
      const result = await redis.eval(script, 1, lockKey, token)
      return result === 1
    } catch (error) {
      log.warn({ error, key }, 'Lock release error')
      return false
    }
  }
}
