import { registry } from '../invalidation-registry'
import { getAdapter } from '../adapter'
import { CacheNamespaces } from '../cache'

registry.register('partner', async () => {
  await getAdapter().invalidateNamespace(CacheNamespaces.PARTNER)
})
