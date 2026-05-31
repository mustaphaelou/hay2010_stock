import { registry } from '../invalidation-registry'
import { getAdapter } from '../adapter'
import { CacheNamespaces } from '../cache'

registry.register('document', async () => {
  await getAdapter().invalidateNamespace(CacheNamespaces.DOCUMENT)
})
