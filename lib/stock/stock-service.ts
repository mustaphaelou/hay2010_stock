import { prisma, withTransaction } from '@/lib/db/prisma'
import { getAdapter } from '@/lib/cache/adapter'
import { CacheNamespaces, CacheTTLSeconds } from '@/lib/cache/cache'
import { createLogger } from '@/lib/logger'
import type { StockLevelWithProduct, Depot } from '@/lib/types'
import { getPaginationParams, buildPaginationMeta, createEmptyResult } from '@/lib/pagination'
import type { PaginatedResult } from '@/lib/pagination'
import { paginationSchema } from '@/lib/pagination'
import {
  createMovementSchema,
  createStockLevelSchema,
  adjustStockLevelSchema,
  deleteStockLevelSchema,
} from '@/lib/stock/validation'
import { niveauStockService } from '@/lib/stock/niveau-stock-service'
import { serviceError, validatedOrError } from '@/lib/service-result'

const log = createLogger('stock-service')

export async function getStockLevels(page: number = 1, limit: number = 50): Promise<PaginatedResult<StockLevelWithProduct> & { error?: string; code?: import('@/lib/service-result').ServiceErrorCode }> {
  const result = validatedOrError(paginationSchema, { page, limit }, { message: 'Invalid pagination parameters' })
  if (result.error) {
    return { ...createEmptyResult<StockLevelWithProduct>(page, limit, result.error), error: result.error, code: result.code }
  }
  const safePage = result.data?.page ?? page
  const safeLimit = result.data?.limit ?? limit
  const { skip } = getPaginationParams({ page: safePage, limit: safeLimit })

  try {
    const [stockQuery, total] = await Promise.all([
      prisma.niveauStock.findMany({
        skip,
        take: safeLimit,
        include: {
          produit: { select: { nom_produit: true, code_produit: true, prix_achat: true } },
          entrepot: { select: { nom_entrepot: true, id_entrepot: true } }
        },
        orderBy: { date_modification: 'desc' }
      }),
      prisma.niveauStock.count()
    ])

    const data = stockQuery.map((stock): StockLevelWithProduct => {
      const produit = stock.produit
      const entrepot = stock.entrepot

      return {
        id_stock: stock.id_stock,
        id_produit: stock.id_produit,
        id_entrepot: stock.id_entrepot,
        quantite_en_stock: stock.quantite_en_stock,
        quantite_reservee: stock.quantite_reservee,
        quantite_commandee: stock.quantite_commandee,
        date_dernier_mouvement: stock.date_dernier_mouvement,
        type_dernier_mouvement: stock.type_dernier_mouvement,
        date_creation: stock.date_creation,
        date_modification: stock.date_modification,
        quantite_en_stock_num: Number(stock.quantite_en_stock ?? 0),
        quantite_reservee_num: Number(stock.quantite_reservee ?? 0),
        cout_moyen_pondere: produit ? Number(produit.prix_achat ?? 0) : 0,
        valeur_stock: produit
          ? Number(stock.quantite_en_stock ?? 0) * Number(produit.prix_achat ?? 0)
          : 0,
        produit: produit
          ? { nom_produit: produit.nom_produit, code_produit: produit.code_produit, prix_achat: produit.prix_achat }
          : null,
        entrepot: entrepot
          ? { nom_entrepot: entrepot.nom_entrepot, id_entrepot: entrepot.id_entrepot }
          : null
      }
    })

    return { data, meta: buildPaginationMeta(total, safePage, safeLimit) }
  } catch (error) {
    log.error({ error }, 'Failed to fetch stock levels')
    return { ...createEmptyResult<StockLevelWithProduct>(safePage, safeLimit, 'Failed to fetch stock levels'), ...serviceError('Failed to fetch stock levels', 'INTERNAL') }
  }
}

export async function getDepots(): Promise<{ data: Depot[]; error?: string; code?: import('@/lib/service-result').ServiceErrorCode }> {
  try {
    const cacheKey = 'depots:active'
    const cached = await getAdapter().get<Depot[]>(CacheNamespaces.STOCK, cacheKey)
    if (cached) return { data: cached }

    const depots = await prisma.entrepot.findMany({
      where: { est_actif: true },
      orderBy: { nom_entrepot: 'asc' }
    })
    const result = depots.map((depot): Depot => ({
      ...depot,
      id_depot: depot.id_entrepot,
      nom_depot: depot.nom_entrepot
    }))
    await getAdapter().set(CacheNamespaces.STOCK, cacheKey, result, CacheTTLSeconds.STOCK * 5)
    return { data: result }
  } catch (error) {
    log.error({ error }, 'Failed to fetch depots')
    return { data: [], ...serviceError('Failed to fetch depots', 'INTERNAL') }
  }
}

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

export type MovementResult = {
  movementId: number
  newQuantity: number
}

export async function createStockMovement(input: CreateMovementInput, userId: string): Promise<{ data?: MovementResult; error?: string; code?: import('@/lib/service-result').ServiceErrorCode }> {
  const result = validatedOrError(createMovementSchema, input, { joinIssues: true })
  if (result.error || !result.data) {
    return { error: result.error || 'Données invalides', code: result.code || 'VALIDATION' }
  }

  const validatedInput = result.data

  const lockKey = `stock:${validatedInput.productId}:${validatedInput.warehouseId}`
  const lockToken = await getAdapter().acquireLock(lockKey, 30)
  if (!lockToken) {
    return serviceError('Stock operation in progress, please retry', 'LOCK_CONTENTION')
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
          cree_par: userId,
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
            cree_par: userId,
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

    return { data: result }
  } catch (error) {
    log.error({ error, input: validatedInput }, 'Stock movement failed')
    return serviceError(error instanceof Error ? error.message : 'Failed to create stock movement', 'INTERNAL')
  } finally {
    await getAdapter().releaseLock(lockKey, lockToken)
  }
}

export async function getStockMovements(
  productId?: number,
  warehouseId?: number,
  limit: number = 100
): Promise<{ data: Array<Record<string, unknown>>; error?: string; code?: import('@/lib/service-result').ServiceErrorCode }> {
  if (limit > 500) limit = 500

  try {
    const where: Record<string, unknown> = {}
    if (productId) where.id_produit = productId
    if (warehouseId) where.id_entrepot = warehouseId

    const movements = await prisma.mouvementStock.findMany({
      where,
      include: {
        produit: { select: { code_produit: true, nom_produit: true } },
        entrepot: { select: { nom_entrepot: true } },
      },
      orderBy: { date_mouvement: 'desc' },
      take: limit,
    })

    return {
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
    return { data: [], ...serviceError('Échec de la récupération des mouvements de stock', 'INTERNAL') }
  }
}

export type StockLevelResult = {
  id_stock: number
  id_produit: number
  id_entrepot: number
  quantite_en_stock: number
  quantite_reservee: number
  quantite_commandee: number
}

export async function createStockLevel(
  input: { productId: number; warehouseId: number; quantite_en_stock?: number; quantite_reservee?: number; quantite_commandee?: number },
  userId: string,
): Promise<{ data?: StockLevelResult; error?: string; code?: import('@/lib/service-result').ServiceErrorCode }> {
  const parsed = validatedOrError(createStockLevelSchema, input, { joinIssues: true })
  if (parsed.error || !parsed.data) {
    return { error: parsed.error || 'Données invalides', code: parsed.code || 'VALIDATION' }
  }

  const d = parsed.data

  try {
    const product = await prisma.produit.findUnique({
      where: { id_produit: d.productId },
    })
    if (!product) {
      return serviceError('Produit introuvable', 'NOT_FOUND')
    }

    const warehouse = await prisma.entrepot.findUnique({
      where: { id_entrepot: d.warehouseId },
    })
    if (!warehouse) {
      return serviceError('Entrepôt introuvable', 'NOT_FOUND')
    }

    const qty = d.quantite_en_stock ?? 0
    const reserved = d.quantite_reservee ?? 0
    const ordered = d.quantite_commandee ?? 0

    const serviceResult = await niveauStockService.create({
      id_produit: d.productId,
      id_entrepot: d.warehouseId,
      quantite_en_stock: qty,
      quantite_reservee: reserved,
      quantite_commandee: ordered,
    })
    if (serviceResult.error) {
      return { error: serviceResult.error, code: serviceResult.code }
    }

    const created = serviceResult.data

    if (qty > 0) {
      await prisma.mouvementStock.create({
        data: {
          id_produit: d.productId,
          id_entrepot: d.warehouseId,
          type_mouvement: 'INVENTAIRE',
          quantite: qty,
          motif: 'Mouvement initial du niveau de stock',
          cree_par: userId,
        },
      })
    }

    return {
      data: {
        id_stock: created.id_stock,
        id_produit: created.id_produit,
        id_entrepot: created.id_entrepot,
        quantite_en_stock: Number(created.quantite_en_stock),
        quantite_reservee: Number(created.quantite_reservee),
        quantite_commandee: Number(created.quantite_commandee),
      },
    }
  } catch (error) {
    log.error({ error, input: d }, 'createStockLevel failed')
    return serviceError(error instanceof Error ? error.message : 'Échec de la création du niveau de stock', 'INTERNAL')
  }
}

export type AdjustmentResult = {
  previousQuantity: number
  newQuantity: number
  delta: number
}

export async function adjustStockLevel(
  input: { productId: number; warehouseId: number; newQuantity: number; motif?: string },
  userId: string,
): Promise<{ data?: AdjustmentResult; error?: string; code?: import('@/lib/service-result').ServiceErrorCode }> {
  const result = validatedOrError(adjustStockLevelSchema, input, { joinIssues: true })
  if (result.error || !result.data) {
    return { error: result.error || 'Données invalides', code: result.code || 'VALIDATION' }
  }

  const validatedInput = result.data

  const lockKey = `stock:${validatedInput.productId}:${validatedInput.warehouseId}`
  const lockToken = await getAdapter().acquireLock(lockKey, 30)
  if (!lockToken) {
    return serviceError('Stock operation in progress, please retry', 'LOCK_CONTENTION')
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
      const newQty = validatedInput.newQuantity
      const delta = newQty - currentQty

      if (newQty < 0) {
        throw new Error('Stock cannot be negative')
      }

      if (delta !== 0) {
        const absDelta = Math.abs(delta)

        await tx.mouvementStock.create({
          data: {
            id_produit: validatedInput.productId,
            id_entrepot: validatedInput.warehouseId,
            type_mouvement: 'INVENTAIRE',
            quantite: absDelta,
            motif: validatedInput.motif || 'Ajustement inventaire: sortie ancien stock',
            cree_par: userId,
          },
        })

        await tx.mouvementStock.create({
          data: {
            id_produit: validatedInput.productId,
            id_entrepot: validatedInput.warehouseId,
            type_mouvement: 'INVENTAIRE',
            quantite: absDelta,
            motif: validatedInput.motif || 'Ajustement inventaire: entrée nouveau stock',
            cree_par: userId,
          },
        })

        await tx.niveauStock.update({
          where: { id_stock: stockLevel.id_stock },
          data: {
            quantite_en_stock: newQty,
            date_dernier_mouvement: new Date(),
            type_dernier_mouvement: 'INVENTAIRE',
          },
        })
      }

      return {
        previousQuantity: currentQty,
        newQuantity: newQty,
        delta,
      }
    })

    return { data: result }
  } catch (error) {
    log.error({ error, input: validatedInput }, 'adjustStockLevel failed')
    return serviceError(error instanceof Error ? error.message : 'Échec de l\'ajustement du niveau de stock', 'INTERNAL')
  } finally {
    await getAdapter().releaseLock(lockKey, lockToken)
  }
}

export async function deleteStockLevel(
  id: number,
): Promise<{ data?: void; error?: string; code?: import('@/lib/service-result').ServiceErrorCode }> {
  const result = validatedOrError(deleteStockLevelSchema, { id }, { joinIssues: true })
  if (result.error) {
    return { error: result.error, code: result.code }
  }

  try {
    const existing = await prisma.niveauStock.findUnique({
      where: { id_stock: id },
    })

    if (!existing) {
      return serviceError('Niveau de stock introuvable', 'NOT_FOUND')
    }

    if (Number(existing.quantite_en_stock) !== 0) {
      return serviceError('Impossible de supprimer un niveau de stock dont la quantité n\'est pas à zéro', 'CONFLICT')
    }

    await prisma.niveauStock.delete({
      where: { id_stock: id },
    })

    return { data: undefined }
  } catch (error) {
    log.error({ error, id }, 'deleteStockLevel failed')
    return serviceError(error instanceof Error ? error.message : 'Échec de la suppression du niveau de stock', 'INTERNAL')
  }
}
