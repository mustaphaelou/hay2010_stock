import { registry } from '../invalidation-registry'
import { getAdapter } from '../adapter'
import { CacheNamespaces } from '../cache'

registry.register('category', async () => {
  await Promise.all([
    getAdapter().invalidateNamespace(CacheNamespaces.CATEGORY),
    getAdapter().invalidateNamespace(CacheNamespaces.PRODUCT),
  ])
})
