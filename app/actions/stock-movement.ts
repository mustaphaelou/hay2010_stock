'use server'

export const maxDuration = 60

import { prisma, withTransaction } from '@/lib/db/prisma'
import { requirePermission } from '@/lib/auth/authorization'
import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { CacheService } from '@/lib/db/redis'
import { CacheInvalidationService } from '@/lib/cache/invalidation'
import { createLogger } from '@/lib/logger'
import { createMovementSchema } from '@/lib/validation'

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
  const user = await requirePermission('stock:write')

  try {
    const { requireCsrfToken, getCsrfCookie } = await import('@/lib/security/csrf-server')
    const csrfCookie = await getCsrfCookie()
    await requireCsrfToken(user.id, csrfToken, csrfCookie || '')
  } catch {
    return { error: 'Invalid security token. Please refresh the page and try again.' }
  }

  const validation = createMovementSchema.safeParse(input)
  if (!validation.success) {
    return { error: validation.error.issues.map(e => e.message).join(', ') }
  }

  const validatedInput = validation.data

  const lockKey = `stock:${validatedInput.productId}:${validatedInput.warehouseId}`
  const lockToken = await CacheService.acquireLock(lockKey, 30)
  if (!lockToken) {
    return { error: 'Stock operation in progress, please retry' }
  }

  try {
    const result = await withTransaction(async (tx) => {
      let stockLevel = await tx.niveauStock.findUnique({
        where: {
          id_produit_id_entrepot: {
            id_produit: validatedInput.productId,
            id_entrepot: validatedInput.warehouseId,
          },
        },
      })

      if (!stockLevel) {
        stockLevel = await tx.niveauStock.create({
          data: {
            id_produit: validatedInput.productId,
            id_entrepot: validatedInput.warehouseId,
            quantite_en_stock: 0,
            quantite_reservee: 0,
            quantite_commandee: 0,
          },
        })
      }

      const currentQty = Number(stockLevel.quantite_en_stock)
      let delta = validatedInput.quantity

      if (validatedInput.type === 'SORTIE' || validatedInput.type === 'TRANSFERT') {
        delta = -validatedInput.quantity
      }

      const newQty = currentQty + delta

      if (newQty < 0) {
        throw new Error(`Insufficient stock. Current: ${currentQty}, Requested: ${validatedInput.quantity}`)
      }

      const movement = await tx.mouvementStock.create({
        data: {
          id_produit: validatedInput.productId,
          id_entrepot: validatedInput.warehouseId,
          type_mouvement: validatedInput.type,
          quantite: validatedInput.quantity,
          reference_document: validatedInput.reference,
          motif: validatedInput.motif,
          cree_par: user.id,
        },
      })

      await tx.niveauStock.update({
        where: { id_stock: stockLevel.id_stock },
        data: {
          quantite_en_stock: newQty,
          date_dernier_mouvement: new Date(),
          type_dernier_mouvement: validatedInput.type,
        },
      })

      if (validatedInput.type === 'TRANSFERT' && validatedInput.destinationWarehouseId) {
        let destStockLevel = await tx.niveauStock.findUnique({
          where: {
            id_produit_id_entrepot: {
              id_produit: validatedInput.productId,
              id_entrepot: validatedInput.destinationWarehouseId,
            },
          },
        })

        if (!destStockLevel) {
          destStockLevel = await tx.niveauStock.create({
            data: {
              id_produit: validatedInput.productId,
              id_entrepot: validatedInput.destinationWarehouseId,
              quantite_en_stock: 0,
              quantite_reservee: 0,
              quantite_commandee: 0,
            },
          })
        }

        await tx.mouvementStock.create({
          data: {
            id_produit: validatedInput.productId,
            id_entrepot: validatedInput.destinationWarehouseId,
            type_mouvement: 'ENTREE',
            quantite: validatedInput.quantity,
            reference_document: validatedInput.reference,
            motif: `Transfer from warehouse ${validatedInput.warehouseId}`,
            cree_par: user.id,
          },
        })

        const destNewQty = Number(destStockLevel.quantite_en_stock) + validatedInput.quantity
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

    after(() => {
      CacheInvalidationService.invalidateProduct(validatedInput.productId)
      CacheInvalidationService.invalidateStock(validatedInput.productId, validatedInput.warehouseId)
    })

  revalidatePath('/stock')
    return { success: true, data: result }
	} catch (error) {
    log.error({ error, input: validatedInput }, 'Stock movement failed')
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
  await requirePermission('stock:read')

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
