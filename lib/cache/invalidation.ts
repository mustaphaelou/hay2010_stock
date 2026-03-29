import { CacheService, CacheKeys } from '@/lib/db/redis-cluster'

export class CacheInvalidationService {
  static async invalidateProduct(productId: number): Promise<void> {
    try {
      await Promise.all([
        CacheService.delete(`${CacheKeys.PRODUCT}${productId}`),
        CacheService.deletePattern(`${CacheKeys.PRODUCT}list:*`),
        CacheService.deletePattern(`${CacheKeys.STOCK}*:${productId}:*`),
      ])
    } catch (error) {
      console.error('[Cache] Failed to invalidate product:', error)
    }
  }

  static async invalidatePartner(partnerId: number): Promise<void> {
    try {
      await Promise.all([
        CacheService.delete(`${CacheKeys.PARTNER}${partnerId}`),
        CacheService.deletePattern(`${CacheKeys.PARTNER}list:*`),
      ])
    } catch (error) {
      console.error('[Cache] Failed to invalidate partner:', error)
    }
  }

  static async invalidateDocument(documentId: number): Promise<void> {
    try {
      await Promise.all([
        CacheService.delete(`${CacheKeys.DOCUMENT}${documentId}`),
        CacheService.deletePattern(`${CacheKeys.DOCUMENT}list:*`),
      ])
    } catch (error) {
      console.error('[Cache] Failed to invalidate document:', error)
    }
  }

  static async invalidateUser(userId: string): Promise<void> {
    try {
      await CacheService.delete(`${CacheKeys.USER}${userId}`)
    } catch (error) {
      console.error('[Cache] Failed to invalidate user:', error)
    }
  }

  static async invalidateStock(productId: number, warehouseId: number): Promise<void> {
    try {
      const key = `${CacheKeys.STOCK}${productId}:${warehouseId}`
      await CacheService.delete(key)
      await CacheService.deletePattern(`${CacheKeys.STOCK}list:*`)
    } catch (error) {
      console.error('[Cache] Failed to invalidate stock:', error)
    }
  }

  static async invalidateAll(): Promise<void> {
    try {
      await CacheService.deletePattern('*')
      console.log('[Cache] All caches invalidated')
    } catch (error) {
      console.error('[Cache] Failed to invalidate all caches:', error)
    }
  }

  static async warmupProductList(): Promise<void> {
    console.log('[Cache] Warming up product list cache...')
  }

  static async warmupPartnerList(): Promise<void> {
    console.log('[Cache] Warming up partner list cache...')
  }

  static async warmupStockLevels(): Promise<void> {
    console.log('[Cache] Warming up stock levels cache...')
  }
}

export async function withCacheInvalidation<T>(
  operation: () => Promise<T>,
  invalidations: Array<() => Promise<void>>
): Promise<T> {
  const result = await operation()
  
  await Promise.all(invalidations.map(fn => fn()))
  
  return result
}
