import { registry } from '../invalidation-registry'
import { getAdapter } from '../adapter'
import { CacheNamespaces } from '../cache'

registry.register('dashboard', async () => {
  await getAdapter().invalidateNamespace(CacheNamespaces.DASHBOARD)
})
