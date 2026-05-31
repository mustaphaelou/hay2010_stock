import { registry } from '../invalidation-registry'
import { getAdapter } from '../adapter'
import { CacheNamespaces } from '../cache'

registry.register('all', async () => {
  await Promise.all([
    getAdapter().invalidateNamespace(CacheNamespaces.PRODUCT),
    getAdapter().invalidateNamespace(CacheNamespaces.STOCK),
    getAdapter().invalidateNamespace(CacheNamespaces.PARTNER),
    getAdapter().invalidateNamespace(CacheNamespaces.DOCUMENT),
    getAdapter().invalidateNamespace(CacheNamespaces.USER),
    getAdapter().invalidateNamespace(CacheNamespaces.DASHBOARD),
    getAdapter().invalidateNamespace(CacheNamespaces.AFFAIRE),
    getAdapter().invalidateNamespace(CacheNamespaces.WAREHOUSE),
    getAdapter().invalidateNamespace(CacheNamespaces.CATEGORY),
  ])
})
