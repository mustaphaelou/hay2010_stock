import { registry } from '../invalidation-registry'
import { getAdapter } from '../adapter'
import { CacheNamespaces } from '../cache'

registry.register('stock', async () => {
  await getAdapter().invalidateNamespace(CacheNamespaces.STOCK)
})
