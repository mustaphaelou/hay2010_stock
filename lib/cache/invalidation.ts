import { registry } from './invalidation-registry'
import './domains'

export type CacheInvalidation =
  | { kind: 'product'; productId?: number }
  | { kind: 'stock'; productId?: number; warehouseId?: number }
  | { kind: 'partner'; partnerId?: number }
  | { kind: 'document'; documentId?: number }
  | { kind: 'user'; userId?: string }
  | { kind: 'affaire'; affaireId?: number }
  | { kind: 'warehouse'; warehouseId?: number }
  | { kind: 'category'; categoryId?: number }
  | { kind: 'dashboard' }
  | { kind: 'all' }

export async function runInvalidations(invalidations: CacheInvalidation[]): Promise<void> {
  await registry.run(invalidations)
}
