import { registry } from '../invalidation-registry'
import { getAdapter } from '../adapter'
import { CacheNamespaces } from '../cache'

registry.register('warehouse', async () => {
  await Promise.all([
    getAdapter().invalidateNamespace(CacheNamespaces.WAREHOUSE),
    getAdapter().invalidateNamespace(CacheNamespaces.STOCK),
  ])
})
