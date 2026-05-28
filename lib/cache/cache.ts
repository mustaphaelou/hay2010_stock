export const CacheNamespaces = {
  PRODUCT: 'product',
  STOCK: 'stock',
  PARTNER: 'partner',
  DOCUMENT: 'document',
  USER: 'user',
  DASHBOARD: 'dashboard',
  AFFAIRE: 'affaire',
  WAREHOUSE: 'warehouse',
  CATEGORY: 'category',
} as const

export const CacheTTLSeconds = {
  PRODUCT: 900,
  STOCK: 60,
  PARTNER: 3600,
  DOCUMENT: 300,
  USER: 3600,
  DASHBOARD: 30,
  AFFAIRE: 900,
  WAREHOUSE: 900,
  CATEGORY: 900,
} as const

export interface CacheAdapter {
  get<T>(ns: string, key: string): Promise<T | null>
  set<T>(ns: string, key: string, value: T, ttl?: number): Promise<boolean>
  delete(ns: string, key: string): Promise<boolean>
  getOrSet<T>(ns: string, key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T>
  invalidateNamespace(ns: string): Promise<void>
  acquireLock(key: string, ttl?: number): Promise<string | null>
  releaseLock(key: string, token: string): Promise<boolean>
}
