'use server'

export const maxDuration = 60

import { requirePermission } from '@/lib/auth/authorization'
import { createStockMovement as createMovement, getStockMovements as getMovements } from '@/lib/stock/stock-service'
import { executeStockWrite } from '@/lib/stock/stock-write'

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
return executeStockWrite<MovementResult>({
csrfToken,
    writeFn: (user) => createMovement(input, user.id),
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
