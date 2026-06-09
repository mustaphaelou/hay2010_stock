import { registry, type CacheInvalidation } from '../invalidation-registry'
import { getAdapter } from '../adapter'
import { CacheNamespaces } from '../cache'

type InvalidationAction =
  | { type: 'invalidateNamespace'; namespace: keyof typeof CacheNamespaces }
  | { type: 'delete'; namespace: keyof typeof CacheNamespaces; keyExtractor: (inv: CacheInvalidation) => string }

const invalidationRules: Record<string, InvalidationAction[]> = {
  product: [
    { type: 'invalidateNamespace', namespace: 'PRODUCT' },
    { type: 'invalidateNamespace', namespace: 'STOCK' },
  ],
  stock: [
    { type: 'invalidateNamespace', namespace: 'STOCK' },
  ],
  partner: [
    { type: 'invalidateNamespace', namespace: 'PARTNER' },
  ],
  document: [
    { type: 'invalidateNamespace', namespace: 'DOCUMENT' },
  ],
  user: [
    { type: 'delete', namespace: 'USER', keyExtractor: (inv) => ('userId' in inv ? (inv.userId ?? '') : '') },
  ],
  affaire: [
    { type: 'invalidateNamespace', namespace: 'AFFAIRE' },
  ],
  warehouse: [
    { type: 'invalidateNamespace', namespace: 'WAREHOUSE' },
    { type: 'invalidateNamespace', namespace: 'STOCK' },
  ],
  category: [
    { type: 'invalidateNamespace', namespace: 'CATEGORY' },
    { type: 'invalidateNamespace', namespace: 'PRODUCT' },
  ],
  dashboard: [
    { type: 'invalidateNamespace', namespace: 'DASHBOARD' },
  ],
  all: [
    { type: 'invalidateNamespace', namespace: 'PRODUCT' },
    { type: 'invalidateNamespace', namespace: 'STOCK' },
    { type: 'invalidateNamespace', namespace: 'PARTNER' },
    { type: 'invalidateNamespace', namespace: 'DOCUMENT' },
    { type: 'invalidateNamespace', namespace: 'USER' },
    { type: 'invalidateNamespace', namespace: 'DASHBOARD' },
    { type: 'invalidateNamespace', namespace: 'AFFAIRE' },
    { type: 'invalidateNamespace', namespace: 'WAREHOUSE' },
    { type: 'invalidateNamespace', namespace: 'CATEGORY' },
  ],
}

for (const [kind, actions] of Object.entries(invalidationRules)) {
  registry.register(kind, async (inv) => {
    const adapter = getAdapter()
    await Promise.all(
      actions.map(async (action) => {
        if (action.type === 'invalidateNamespace') {
          await adapter.invalidateNamespace(CacheNamespaces[action.namespace])
        } else if (action.type === 'delete') {
          await adapter.delete(CacheNamespaces[action.namespace], action.keyExtractor(inv))
        }
      })
    )
  })
}
