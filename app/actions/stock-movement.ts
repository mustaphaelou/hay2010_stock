'use server'

export const maxDuration = 60

import { requirePermission } from '@/lib/auth/authorization'
import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { validateActionCsrf } from '@/lib/utils/action-helpers'
import { createStockMovement as createMovement, getStockMovements as getMovements } from '@/lib/stock/stock-service'
import { CacheInvalidationService } from '@/lib/cache/invalidation'

export type MovementType = 'ENTREE' | 'SORTIE' | 'TRANSFERT' | 'INVENTAIRE'

export interface CreateMovementInput {
  productId: number
  warehouseId: number
  quantity: number
  type: MovementType
  reference?: string
  motif?: string
  destinationWarehouseId?: number
}

export interface MovementResult {
  success?: boolean
  error?: string
  data?: {
    movementId: number
    newQuantity: number
  }
}

export async function createStockMovement(input: CreateMovementInput, csrfToken: string): Promise<MovementResult> {
  const user = await requirePermission('stock:write')

  const csrfError = await validateActionCsrf(user.id, csrfToken)
  if (csrfError) return { error: csrfError }

  const result = await createMovement(input, user.id)
  if (result.success && result.data) {
    after(() => {
      CacheInvalidationService.invalidateProduct(input.productId)
      CacheInvalidationService.invalidateStock(input.productId, input.warehouseId)
    })
  }

  revalidatePath('/stock')
  return result
}

export async function getStockMovements(
  productId?: number,
  warehouseId?: number,
  limit: number = 100
) {
  await requirePermission('stock:read')
  return getMovements(productId, warehouseId, limit)
}
