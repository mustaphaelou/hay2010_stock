'use server'

export const maxDuration = 60

import { requirePermission } from '@/lib/auth/authorization'
import { createStockMovement as createMovement, getStockMovements as getMovements } from '@/lib/stock/stock-service'
import { serverActionWrite } from '@/lib/actions/server-action-write'

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

export async function createStockMovement(input: CreateMovementInput, csrfToken: string) {
  return serverActionWrite('stock:write', csrfToken, (user) => createMovement(input, user.id), {
    invalidations: [
      { kind: 'product', productId: input.productId },
      { kind: 'stock', productId: input.productId, warehouseId: input.warehouseId },
    ],
    revalidatePaths: ['/stock'],
  })
}

export async function getStockMovements(
  productId?: number,
  warehouseId?: number,
  limit: number = 100
) {
  await requirePermission('stock:read')
  return getMovements(productId, warehouseId, limit)
}
