'use server'

import { prisma, withTransaction } from '@/lib/db/prisma'
import { requireRole } from '@/lib/auth/user-utils'
import { revalidatePath } from 'next/cache'
import { CacheService } from '@/lib/db/redis-cluster'
import { CacheInvalidationService } from '@/lib/cache/invalidation'
import { createLogger } from '@/lib/logger'
import { UserRole } from '@/lib/auth/authorization'

const log = createLogger('stock-movement-actions')

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
  const user = await requireRole(['ADMIN', 'MANAGER'] as UserRole[])

  try {
      const { requireCsrfToken, getCsrfCookie } = await import('@/lib/security/csrf-server')
      const csrfCookie = await getCsrfCookie()
      await requireCsrfToken(user.id, csrfToken, csrfCookie || '')
  } catch {
    return { error: 'Invalid security token. Please refresh the page and try again.' }
  }

  if (input.quantity <= 0) {
    return { error: 'Quantity must be positive' }
  }

  if (input.type === 'TRANSFERT' && !input.destinationWarehouseId) {
    return { error: 'Destination warehouse required for transfer' }
  }

  const lockKey = `stock:${input.productId}:${input.warehouseId}`
  const lockToken = await CacheService.acquireLock(lockKey, 30)
  if (!lockToken) {
    return { error: 'Stock operation in progress, please retry' }
  }

  try {
    const result = await withTransaction(async (tx) => {
      let stockLevel = await tx.niveauStock.findUnique({
        where: {
          id_produit_id_entrepot: {
            id_produit: input.productId,
            id_entrepot: input.warehouseId,
          },
        },
      })

      if (!stockLevel) {
        stockLevel = await tx.niveauStock.create({
          data: {
            id_produit: input.productId,
            id_entrepot: input.warehouseId,
            quantite_en_stock: 0,
            quantite_reservee: 0,
            quantite_commandee: 0,
          },
        })
      }

      const currentQty = Number(stockLevel.quantite_en_stock)
      let delta = input.quantity

      if (input.type === 'SORTIE' || input.type === 'TRANSFERT') {
        delta = -input.quantity
      }

      const newQty = currentQty + delta

      if (newQty < 0) {
        throw new Error(`Insufficient stock. Current: ${currentQty}, Requested: ${input.quantity}`)
      }

      const movement = await tx.mouvementStock.create({
        data: {
          id_produit: input.productId,
          id_entrepot: input.warehouseId,
          type_mouvement: input.type,
          quantite: input.quantity,
          reference_document: input.reference,
          motif: input.motif,
          cree_par: user.id,
        },
      })

      await tx.niveauStock.update({
        where: { id_stock: stockLevel.id_stock },
        data: {
          quantite_en_stock: newQty,
          date_dernier_mouvement: new Date(),
          type_dernier_mouvement: input.type,
        },
      })

      if (input.type === 'TRANSFERT' && input.destinationWarehouseId) {
        let destStockLevel = await tx.niveauStock.findUnique({
          where: {
            id_produit_id_entrepot: {
              id_produit: input.productId,
              id_entrepot: input.destinationWarehouseId,
            },
          },
        })

        if (!destStockLevel) {
          destStockLevel = await tx.niveauStock.create({
            data: {
              id_produit: input.productId,
              id_entrepot: input.destinationWarehouseId,
              quantite_en_stock: 0,
              quantite_reservee: 0,
              quantite_commandee: 0,
            },
          })
        }

        await tx.mouvementStock.create({
          data: {
            id_produit: input.productId,
            id_entrepot: input.destinationWarehouseId,
            type_mouvement: 'ENTREE',
            quantite: input.quantity,
            reference_document: input.reference,
            motif: `Transfer from warehouse ${input.warehouseId}`,
            cree_par: user.id,
          },
        })

        const destNewQty = Number(destStockLevel.quantite_en_stock) + input.quantity
        await tx.niveauStock.update({
          where: { id_stock: destStockLevel.id_stock },
          data: {
            quantite_en_stock: destNewQty,
            date_dernier_mouvement: new Date(),
            type_dernier_mouvement: 'ENTREE',
          },
        })
      }

      return {
        movementId: movement.id_mouvement,
        newQuantity: newQty,
      }
    })

    await CacheInvalidationService.invalidateProduct(input.productId)
    await CacheInvalidationService.invalidateStock(input.productId, input.warehouseId)

    revalidatePath('/stock')
    return { success: true, data: result }
	} catch (error) {
		log.error({ error, input }, 'Stock movement failed')
		return {
      error: error instanceof Error ? error.message : 'Failed to create stock movement',
    }
  } finally {
    await CacheService.releaseLock(lockKey, lockToken)
  }
}

export async function getStockMovements(
  productId?: number,
  warehouseId?: number,
  limit: number = 100
) {
  await requireRole(['ADMIN', 'MANAGER', 'USER', 'VIEWER'] as UserRole[])

  if (limit > 500) limit = 500

  try {
    const where: Record<string, unknown> = {}
    if (productId) where.id_produit = productId
    if (warehouseId) where.id_entrepot = warehouseId

    const movements = await prisma.mouvementStock.findMany({
      where,
      include: {
        produit: {
          select: {
            code_produit: true,
            nom_produit: true,
          },
        },
        entrepot: {
          select: {
            nom_entrepot: true,
          },
        },
      },
      orderBy: {
        date_mouvement: 'desc',
      },
      take: limit,
    })

    return {
      success: true,
      data: movements.map((m) => ({
        id_mouvement: m.id_mouvement,
        id_produit: m.id_produit,
        id_entrepot: m.id_entrepot,
        type_mouvement: m.type_mouvement,
        quantite: Number(m.quantite),
        date_mouvement: m.date_mouvement,
        reference_document: m.reference_document,
        motif: m.motif,
        produit: m.produit,
        entrepot: m.entrepot,
      })),
    }
	} catch (error) {
		log.error({ error, productId, warehouseId }, 'Failed to fetch stock movements')
		return { error: 'Failed to fetch stock movements' }
  }
}
