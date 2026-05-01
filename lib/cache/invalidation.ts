import { CacheVersionService, VersionedCacheService, CacheNamespaces, CacheTTLSeconds } from './versioned'
import { createLogger } from '@/lib/logger'

const log = createLogger('cache-invalidation')

export class CacheInvalidationService {
  static async invalidateProduct(productId: number): Promise<void> {
    try {
      await CacheVersionService.invalidateNamespace(CacheNamespaces.PRODUCT)
      await CacheVersionService.invalidateNamespace(CacheNamespaces.STOCK)
      log.info({ productId }, 'Product cache invalidated')
    } catch (error) {
      log.error({ productId, error }, 'Failed to invalidate product')
    }
  }

  static async invalidatePartner(partnerId: number): Promise<void> {
    try {
      await CacheVersionService.invalidateNamespace(CacheNamespaces.PARTNER)
      log.info({ partnerId }, 'Partner cache invalidated')
    } catch (error) {
      log.error({ partnerId, error }, 'Failed to invalidate partner')
    }
  }

  static async invalidateDocument(documentId: number): Promise<void> {
    try {
      await CacheVersionService.invalidateNamespace(CacheNamespaces.DOCUMENT)
      log.info({ documentId }, 'Document cache invalidated')
    } catch (error) {
      log.error({ documentId, error }, 'Failed to invalidate document')
    }
  }

  static async invalidateUser(userId: string): Promise<void> {
    try {
      await VersionedCacheService.delete(CacheNamespaces.USER, userId)
      log.info({ userId }, 'User cache invalidated')
    } catch (error) {
      log.error({ userId, error }, 'Failed to invalidate user')
    }
  }

  static async invalidateStock(productId: number, warehouseId: number): Promise<void> {
    try {
      await CacheVersionService.invalidateNamespace(CacheNamespaces.STOCK)
      log.info({ productId, warehouseId }, 'Stock cache invalidated')
    } catch (error) {
      log.error({ productId, warehouseId, error }, 'Failed to invalidate stock')
    }
  }

  static async invalidateDashboard(): Promise<void> {
    try {
      await CacheVersionService.invalidateNamespace(CacheNamespaces.DASHBOARD)
      log.info('Dashboard cache invalidated')
    } catch (error) {
      log.error({ error }, 'Failed to invalidate dashboard')
    }
  }

  static async invalidateAll(): Promise<void> {
    try {
      await Promise.all([
        CacheVersionService.invalidateNamespace(CacheNamespaces.PRODUCT),
        CacheVersionService.invalidateNamespace(CacheNamespaces.STOCK),
        CacheVersionService.invalidateNamespace(CacheNamespaces.PARTNER),
        CacheVersionService.invalidateNamespace(CacheNamespaces.DOCUMENT),
        CacheVersionService.invalidateNamespace(CacheNamespaces.USER),
        CacheVersionService.invalidateNamespace(CacheNamespaces.DASHBOARD),
        CacheVersionService.invalidateNamespace(CacheNamespaces.AFFAIRE),
        CacheVersionService.invalidateNamespace(CacheNamespaces.WAREHOUSE),
        CacheVersionService.invalidateNamespace(CacheNamespaces.CATEGORY),
      ])
      log.info('All caches invalidated')
    } catch (error) {
      log.error({ error }, 'Failed to invalidate all caches')
    }
  }

  static async invalidateAffaire(affaireId: number): Promise<void> {
    try {
      await CacheVersionService.invalidateNamespace(CacheNamespaces.AFFAIRE)
      log.info({ affaireId }, 'Affaire cache invalidated')
    } catch (error) {
      log.error({ affaireId, error }, 'Failed to invalidate affaire')
    }
  }

  static async invalidateWarehouse(warehouseId: number): Promise<void> {
    try {
      await CacheVersionService.invalidateNamespace(CacheNamespaces.WAREHOUSE)
      await CacheVersionService.invalidateNamespace(CacheNamespaces.STOCK)
      log.info({ warehouseId }, 'Warehouse cache invalidated')
    } catch (error) {
      log.error({ warehouseId, error }, 'Failed to invalidate warehouse')
    }
  }

  static async invalidateCategory(categoryId: number): Promise<void> {
    try {
      await CacheVersionService.invalidateNamespace(CacheNamespaces.CATEGORY)
      await CacheVersionService.invalidateNamespace(CacheNamespaces.PRODUCT)
      log.info({ categoryId }, 'Category cache invalidated')
    } catch (error) {
      log.error({ categoryId, error }, 'Failed to invalidate category')
    }
  }

  static async warmupProductList(): Promise<void> {
    log.info('Product list cache warmup started')
  }

  static async warmupPartnerList(): Promise<void> {
    log.info('Partner list cache warmup started')
  }

  static async warmupStockLevels(): Promise<void> {
    log.info('Stock levels cache warmup started')
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

export { CacheNamespaces, CacheTTLSeconds, VersionedCacheService }
