import { runInvalidations, type CacheInvalidation } from '@/lib/cache/invalidation'
import type { CurrentUser } from '@/lib/auth/user-utils'

export async function apiWrite<T extends { error?: string }>(
  user: CurrentUser,
  writeFn: (user: CurrentUser) => Promise<T>,
  invalidations?: CacheInvalidation[],
): Promise<T | { error: string }> {
  const result = await writeFn(user)

  if (!result.error && invalidations && invalidations.length > 0) {
    await runInvalidations(invalidations)
  }

  return result
}
