import { registry } from '../invalidation-registry'
import { getAdapter } from '../adapter'
import { CacheNamespaces } from '../cache'

registry.register('affaire', async () => {
  await getAdapter().invalidateNamespace(CacheNamespaces.AFFAIRE)
})
