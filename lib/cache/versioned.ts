import { redis } from '@/lib/db/redis-cluster'
import { createLogger } from '@/lib/logger'

const log = createLogger('cache-version')

const VERSION_KEY_PREFIX = 'cache:version:'
const DEFAULT_VERSION = '1'

export class CacheVersionService {
  private static versionCache = new Map<string, string>()

  static async getVersion(namespace: string): Promise<string> {
    const cached = this.versionCache.get(namespace)
    if (cached) return cached

    try {
      const key = `${VERSION_KEY_PREFIX}${namespace}`
      let version = await redis.get(key)
      
      if (!version) {
        version = DEFAULT_VERSION
        await redis.set(key, version)
      }

      this.versionCache.set(namespace, version)
      return version
    } catch (error) {
      log.warn({ namespace, error }, 'Failed to get version, using default')
      return DEFAULT_VERSION
    }
  }

  static async incrementVersion(namespace: string): Promise<string> {
    try {
      const key = `${VERSION_KEY_PREFIX}${namespace}`
      const newVersion = await redis.incr(key)
      const versionStr = String(newVersion)
      
      this.versionCache.set(namespace, versionStr)
      
      log.info({ namespace, version: versionStr }, 'Cache version incremented')
      return versionStr
    } catch (error) {
      log.error({ namespace, error }, 'Failed to increment version')
      throw error
    }
  }

  static buildKey(namespace: string, key: string): string {
    const version = this.versionCache.get(namespace) || DEFAULT_VERSION
    return `${namespace}:v${version}:${key}`
  }

  static async buildKeyAsync(namespace: string, key: string): Promise<string> {
    const version = await this.getVersion(namespace)
    return `${namespace}:v${version}:${key}`
  }

  static async invalidateNamespace(namespace: string): Promise<void> {
    await this.incrementVersion(namespace)
    this.versionCache.delete(namespace)
    log.info({ namespace }, 'Namespace invalidated')
  }
}

export class VersionedCacheService {
  static async get<T>(namespace: string, key: string): Promise<T | null> {
    const fullKey = await CacheVersionService.buildKeyAsync(namespace, key)
    try {
      const data = await redis.get(fullKey)
      if (!data) return null
      return JSON.parse(data) as T
    } catch (error) {
      log.warn({ namespace, key, error }, 'Cache get error')
      return null
    }
  }

  static async set<T>(
    namespace: string,
    key: string,
    value: T,
    ttl: number
  ): Promise<boolean> {
    const fullKey = await CacheVersionService.buildKeyAsync(namespace, key)
    try {
      await redis.setex(fullKey, ttl, JSON.stringify(value))
      return true
    } catch (error) {
      log.warn({ namespace, key, error }, 'Cache set error')
      return false
    }
  }

  static async delete(namespace: string, key: string): Promise<boolean> {
    const fullKey = await CacheVersionService.buildKeyAsync(namespace, key)
    try {
      await redis.del(fullKey)
      return true
    } catch (error) {
      log.warn({ namespace, key, error }, 'Cache delete error')
      return false
    }
  }

  static async invalidateNamespace(namespace: string): Promise<void> {
    await CacheVersionService.invalidateNamespace(namespace)
  }

  static async getOrSet<T>(
    namespace: string,
    key: string,
    fetcher: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    const cached = await this.get<T>(namespace, key)
    if (cached !== null) {
      return cached
    }

    const value = await fetcher()
    await this.set(namespace, key, value, ttl)
    return value
  }
}

export const CacheNamespaces = {
  PRODUCT: 'product',
  STOCK: 'stock',
  PARTNER: 'partner',
  DOCUMENT: 'document',
  USER: 'user',
  DASHBOARD: 'dashboard',
} as const

export const CacheTTLSeconds = {
  PRODUCT: 900, // 15 minutes
  STOCK: 60, // 1 minute
  PARTNER: 3600, // 1 hour
  DOCUMENT: 300, // 5 minutes
  USER: 3600, // 1 hour
  DASHBOARD: 30, // 30 seconds
} as const
