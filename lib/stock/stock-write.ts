import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { requirePermission, type Permission } from '@/lib/auth/authorization'
import { validateActionCsrf } from '@/lib/utils/action-helpers'
import { CacheInvalidationService } from '@/lib/cache/invalidation'

export type CacheInvalidation =
  | { kind: 'product'; productId: number }
  | { kind: 'stock'; productId: number; warehouseId: number }

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
  const {
    permission = 'stock:write',
    csrfToken,
    writeFn,
    invalidations = [],
    revalidatePaths = [],
  } = options

  const user = await requirePermission(permission)

  const csrfError = await validateActionCsrf(user.id, csrfToken)
  if (csrfError) return { error: csrfError } as T

  const result = await writeFn(user)

  if (!result.error) {
    after(async () => {
      for (const inv of invalidations) {
        if (inv.kind === 'product') {
          await CacheInvalidationService.invalidateProduct(inv.productId)
        } else if (inv.kind === 'stock') {
          await CacheInvalidationService.invalidateStock(inv.productId, inv.warehouseId)
        }
      }
      for (const path of revalidatePaths) {
        revalidatePath(path)
      }
    })
  }

  return result
}
