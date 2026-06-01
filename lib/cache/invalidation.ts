import { registry, type CacheInvalidation } from './invalidation-registry'
import './domains'

export type { CacheInvalidation }

export async function runInvalidations(invalidations: CacheInvalidation[]): Promise<void> {
  await registry.run(invalidations)
}
