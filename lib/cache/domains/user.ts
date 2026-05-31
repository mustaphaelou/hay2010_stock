import { registry } from '../invalidation-registry'
import { getAdapter } from '../adapter'
import { CacheNamespaces } from '../cache'

registry.register('user', async (inv) => {
  const { userId } = inv as { kind: 'user'; userId?: string }
  await getAdapter().delete(CacheNamespaces.USER, userId ?? '')
})
