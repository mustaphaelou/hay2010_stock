import type { CacheAdapter } from './cache'

interface CacheEntry {
  value: unknown
  expiresAt: number | null
}

export class MemoryCacheAdapter implements CacheAdapter {
  private store = new Map<string, CacheEntry>()
  private namespaceVersions = new Map<string, string>()
  private locks = new Map<string, { token: string; expiresAt: number }>()

  private isExpired(entry: CacheEntry): boolean {
    return entry.expiresAt !== null && entry.expiresAt < Date.now()
  }

  private buildKey(namespace: string, key: string): string {
    const version = this.namespaceVersions.get(namespace) ?? '1'
    return `${namespace}:v${version}:${key}`
  }

  async get<T>(ns: string, key: string): Promise<T | null> {
    const fullKey = this.buildKey(ns, key)
    const entry = this.store.get(fullKey)
    if (!entry) return null
    if (this.isExpired(entry)) {
      this.store.delete(fullKey)
      return null
    }
    return entry.value as T
  }

  async set<T>(ns: string, key: string, value: T, ttl?: number): Promise<boolean> {
    const fullKey = this.buildKey(ns, key)
    const expiresAt = ttl ? Date.now() + ttl * 1000 : null
    this.store.set(fullKey, { value, expiresAt })
    return true
  }

  async delete(ns: string, key: string): Promise<boolean> {
    const fullKey = this.buildKey(ns, key)
    return this.store.delete(fullKey)
  }

  async invalidateNamespace(ns: string): Promise<void> {
    const current = this.namespaceVersions.get(ns) ?? '1'
    this.namespaceVersions.set(ns, String(Number(current) + 1))
  }

  async getOrSet<T>(ns: string, key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = await this.get<T>(ns, key)
    if (cached !== null) return cached

    const value = await fetcher()
    await this.set(ns, key, value, ttl)
    return value
  }

  async acquireLock(key: string, ttl?: number): Promise<string | null> {
    const lockTTL = ttl ?? 30
    const existing = this.locks.get(key)
    if (existing && existing.expiresAt > Date.now()) return null

    const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    this.locks.set(key, { token, expiresAt: Date.now() + lockTTL * 1000 })
    return token
  }

  async releaseLock(key: string, token: string): Promise<boolean> {
    const existing = this.locks.get(key)
    if (!existing || existing.token !== token) return false
    this.locks.delete(key)
    return true
  }
}
