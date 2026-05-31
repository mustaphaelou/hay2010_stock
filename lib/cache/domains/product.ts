import { registry } from '../invalidation-registry'
import { getAdapter } from '../adapter'
import { CacheNamespaces } from '../cache'

registry.register('product', async () => {
  await Promise.all([
    getAdapter().invalidateNamespace(CacheNamespaces.PRODUCT),
    getAdapter().invalidateNamespace(CacheNamespaces.STOCK),
  ])
})
