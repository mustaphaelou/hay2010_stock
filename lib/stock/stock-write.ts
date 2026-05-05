import { executeWrite, type CacheInvalidation } from '@/lib/actions/execute-write'
import type { Permission } from '@/lib/auth/authorization'

export type { CacheInvalidation }

export interface StockWriteOptions<T> {
  permission?: Permission
  csrfToken: string
  writeFn: (user: { id: string; email: string; name: string; role: string }) => Promise<T>
  invalidations?: CacheInvalidation[]
  revalidatePaths?: string[]
}

export async function executeStockWrite<T extends { error?: string }>(
  options: StockWriteOptions<T>
): Promise<T> {
  return executeWrite({
    permission: options.permission ?? 'stock:write',
    csrfToken: options.csrfToken,
    writeFn: options.writeFn,
    invalidations: options.invalidations,
    revalidatePaths: options.revalidatePaths,
  }) as Promise<T>
}
