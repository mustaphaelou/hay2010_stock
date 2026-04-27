import { prisma, withTransaction } from '@/lib/db/prisma'
import { Prisma } from '@/lib/generated/prisma/client'
import { CacheService } from '@/lib/db/redis'
import { VersionedCacheService, CacheNamespaces, CacheTTLSeconds } from '@/lib/cache/versioned'
import { CacheInvalidationService } from '@/lib/cache/invalidation'
import { createLogger } from '@/lib/logger'
import type { ArticleWithStock, StockLevelWithProduct, Depot } from '@/lib/types'
import { getPaginationParams, buildPaginationMeta, createEmptyResult } from '@/lib/pagination'
import type { PaginatedResult } from '@/lib/pagination'
import { paginationSchema } from '@/lib/validation'
import { toggleArticleStatusSchema, createMovementSchema } from '@/lib/stock/validation'

const log = createLogger('stock-service')

async function getStockAggregates(productIds: number[]): Promise<Map<number, number>> {
  if (productIds.length === 0) return new Map()

  const results = await prisma.$queryRaw<Array<{ id_produit: number; stock_global: number }>>`
    SELECT p.id_produit, COALESCE(SUM(n.quantite_en_stock), 0)::float as stock_global
    FROM produits p
    LEFT JOIN niveaux_stock n ON p.id_produit = n.id_produit
    WHERE p.id_produit IN (${Prisma.join(productIds)})
    GROUP BY p.id_produit
  `

  return new Map(results.map(r => [r.id_produit, r.stock_global]))
}

export async function getArticlesWithStock(page: number = 1, limit: number = 50): Promise<PaginatedResult<ArticleWithStock> & { error?: string }> {
  if (limit > 100) limit = 100

  const cacheKey = `list:${page}:${limit}`

  try {
    const cached = await VersionedCacheService.get<PaginatedResult<ArticleWithStock>>(CacheNamespaces.PRODUCT, cacheKey)
    if (cached) return cached

    const { skip, take } = getPaginationParams({ page, limit })

    const [result, total] = await Promise.all([
      prisma.produit.findMany({
        skip,
        take,
        include: { categorie: true },
        orderBy: { nom_produit: 'asc' }
      }),
      prisma.produit.count()
    ])

    const productIds = result.map(a => a.id_produit)
    const stockMap = await getStockAggregates(productIds)

    const data = result.map((article) => ({
      id_produit: article.id_produit,
      code_produit: article.code_produit,
      nom_produit: article.nom_produit,
      famille: article.famille || article.categorie?.nom_categorie || null,
      id_categorie: article.id_categorie,
      description_produit: article.description_produit,
      code_barre_ean: article.code_barre_ean,
      unite_mesure: article.unite_mesure,
      poids_kg: article.poids_kg,
      volume_m3: article.volume_m3,
      prix_achat: article.prix_achat,
      prix_dernier_achat: article.prix_dernier_achat,
      coefficient: article.coefficient,
      prix_vente: article.prix_vente,
      prix_gros: article.prix_gros,
      taux_tva: article.taux_tva,
      type_suivi_stock: article.type_suivi_stock,
      quantite_min_commande: article.quantite_min_commande,
      niveau_reappro_quantite: article.niveau_reappro_quantite,
      stock_minimum: article.stock_minimum,
      stock_maximum: article.stock_maximum,
      activer_suivi_stock: article.activer_suivi_stock,
      id_fournisseur_principal: article.id_fournisseur_principal,
      reference_fournisseur: article.reference_fournisseur,
      delai_livraison_fournisseur_jours: article.delai_livraison_fournisseur_jours,
      est_actif: article.est_actif,
      en_sommeil: article.en_sommeil,
      est_abandonne: article.est_abandonne,
      date_creation: article.date_creation,
      date_modification: article.date_modification,
      cree_par: article.cree_par,
      modifie_par: article.modifie_par,
      compte_general_vente: article.compte_general_vente,
      compte_general_achat: article.compte_general_achat,
      code_taxe_vente: article.code_taxe_vente,
      code_taxe_achat: article.code_taxe_achat,
      categorie: article.categorie ? {
        id_categorie: article.categorie.id_categorie,
        code_categorie: article.categorie.code_categorie,
        nom_categorie: article.categorie.nom_categorie,
        description_categorie: article.categorie.description_categorie,
        est_actif: article.categorie.est_actif,
      } : null,
      niveaux_stock: [],
      stock_global: stockMap.get(article.id_produit) || 0,
    }))

    const response = { data, meta: buildPaginationMeta(total, page, limit) }

    await VersionedCacheService.set(CacheNamespaces.PRODUCT, cacheKey, response, CacheTTLSeconds.PRODUCT)

    return response
  } catch (error) {
    log.error({ error }, 'Failed to fetch articles')
    return createEmptyResult<ArticleWithStock>(page, limit, 'Failed to fetch articles')
  }
}

export async function toggleArticleStatus(
  id_produit: number,
  newStatus: boolean,
): Promise<{ success?: boolean; error?: string }> {
  const validationResult = toggleArticleStatusSchema.safeParse({ id_produit, newStatus })
  if (!validationResult.success) {
    return { error: 'Invalid input: ' + validationResult.error.issues.map((e: { message: string }) => e.message).join(', ') }
  }

  const lockToken = await CacheService.acquireLock(`article:${id_produit}`, 30)
  if (!lockToken) {
    return { error: 'Operation in progress, please retry' }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.produit.update({
        where: { id_produit },
        data: { en_sommeil: newStatus }
      })
    })

    await CacheInvalidationService.invalidateProduct(id_produit)

    return { success: true }
  } catch (error) {
    log.error({ error, id_produit }, 'Failed to toggle article status')
    return { error: 'Failed to update status' }
  } finally {
    await CacheService.releaseLock(`article:${id_produit}`, lockToken)
  }
}

export async function getStockLevels(page: number = 1, limit: number = 50): Promise<PaginatedResult<StockLevelWithProduct> & { error?: string }> {
  const parsed = paginationSchema.safeParse({ page, limit })
  if (!parsed.success) {
    return createEmptyResult<StockLevelWithProduct>(page, limit, 'Invalid pagination parameters')
  }
  const safePage = parsed.data?.page ?? page
  const safeLimit = parsed.data?.limit ?? limit
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
    return createEmptyResult<StockLevelWithProduct>(safePage, safeLimit, 'Failed to fetch stock levels')
  }
}

export async function getDepots(): Promise<Depot[]> {
  try {
    const cacheKey = 'depots:active'
    const cached = await VersionedCacheService.get<Depot[]>(CacheNamespaces.STOCK, cacheKey)
    if (cached) return cached

    const depots = await prisma.entrepot.findMany({
      where: { est_actif: true },
      orderBy: { nom_entrepot: 'asc' }
    })
    const result = depots.map((depot): Depot => ({
      ...depot,
      id_depot: depot.id_entrepot,
      nom_depot: depot.nom_entrepot
    }))
    await VersionedCacheService.set(CacheNamespaces.STOCK, cacheKey, result, CacheTTLSeconds.STOCK * 5)
    return result
  } catch (error) {
    log.error({ error }, 'Failed to fetch depots')
    return []
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

export interface MovementResult {
  success?: boolean
  error?: string
  data?: {
    movementId: number
    newQuantity: number
  }
}

export async function createStockMovement(input: CreateMovementInput, userId: string): Promise<MovementResult> {
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
): Promise<{ success: boolean; data?: Array<Record<string, unknown>>; error?: string }> {
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
