import { prisma, withTransaction } from '@/lib/db/prisma'
import { Prisma } from '@/lib/generated/prisma/client'
import { getAdapter } from '@/lib/cache/adapter'
import { CacheNamespaces, CacheTTLSeconds } from '@/lib/cache/cache'
import { createLogger } from '@/lib/logger'
import type { ArticleWithStock, StockLevelWithProduct, Depot } from '@/lib/types'
import { getPaginationParams, buildPaginationMeta, createEmptyResult } from '@/lib/pagination'
import type { PaginatedResult } from '@/lib/pagination'
import { paginationSchema } from '@/lib/validation'
import {
  toggleArticleStatusSchema,
  createMovementSchema,
  articleCreateSchema,
  articleUpdateSchema,
  getArticleByIdSchema,
  deleteArticleSchema,
  getStockLevelsByArticleSchema,
  createStockLevelSchema,
  adjustStockLevelSchema,
  deleteStockLevelSchema,
  ALLOWED_ARTICLE_SORT_FIELDS,
} from '@/lib/stock/validation'
import type {
  ArticleCreateInput,
  ArticleUpdateInput,
  AllowedArticleSortField,
} from '@/lib/stock/validation'
import { serviceError, validatedOrError } from '@/lib/service-result'

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

export async function getArticlesWithStock(page: number = 1, limit: number = 50): Promise<PaginatedResult<ArticleWithStock> & { error?: string; code?: import('@/lib/service-result').ServiceErrorCode }> {
  if (limit > 100) limit = 100

  const cacheKey = `list:${page}:${limit}`

  try {
    const cached = await getAdapter().get<PaginatedResult<ArticleWithStock>>(CacheNamespaces.PRODUCT, cacheKey)
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

    await getAdapter().set(CacheNamespaces.PRODUCT, cacheKey, response, CacheTTLSeconds.PRODUCT)

    return response
  } catch (error) {
    log.error({ error }, 'Failed to fetch articles')
    return { ...createEmptyResult<ArticleWithStock>(page, limit, 'Failed to fetch articles'), ...serviceError('Failed to fetch articles', 'INTERNAL') }
  }
}

export async function toggleArticleStatus(
  id_produit: number,
  newStatus: boolean,
): Promise<{ data?: { success: boolean }; error?: string; code?: import('@/lib/service-result').ServiceErrorCode }> {
  const result = validatedOrError(toggleArticleStatusSchema, { id_produit, newStatus }, { joinIssues: true })
  if (result.error) {
    return { error: result.error, code: result.code }
  }

  const lockToken = await getAdapter().acquireLock(`article:${id_produit}`, 30)
  if (!lockToken) {
    return serviceError('Operation in progress, please retry', 'LOCK_CONTENTION')
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.produit.update({
        where: { id_produit },
        data: { en_sommeil: newStatus }
      })
    })

    return { data: { success: true } }
  } catch (error) {
    log.error({ error, id_produit }, 'Failed to toggle article status')
    return serviceError('Failed to update status', 'INTERNAL')
  } finally {
    await getAdapter().releaseLock(`article:${id_produit}`, lockToken)
  }
}

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
  if (result.error) {
    return { error: result.error, code: result.code }
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
  if (parsed.error) {
    return { error: parsed.error, code: parsed.code }
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

    const existing = await prisma.niveauStock.findUnique({
      where: {
        id_produit_id_entrepot: {
          id_produit: d.productId,
          id_entrepot: d.warehouseId,
        },
      },
    })
    if (existing) {
      return serviceError('Un niveau de stock existe déjà pour ce couple produit-entrepôt', 'CONFLICT')
    }

    const qty = d.quantite_en_stock ?? 0
    const reserved = d.quantite_reservee ?? 0
    const ordered = d.quantite_commandee ?? 0

    if (qty > 0) {
      const created = await withTransaction(async (tx) => {
        const stockLevel = await tx.niveauStock.create({
          data: {
            id_produit: d.productId,
            id_entrepot: d.warehouseId,
            quantite_en_stock: qty,
            quantite_reservee: reserved,
            quantite_commandee: ordered,
          },
        })

        await tx.mouvementStock.create({
          data: {
            id_produit: d.productId,
            id_entrepot: d.warehouseId,
            type_mouvement: 'INVENTAIRE',
            quantite: qty,
            motif: 'Mouvement initial du niveau de stock',
            cree_par: userId,
          },
        })

        return stockLevel
      })

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
    }

    const stockLevel = await prisma.niveauStock.create({
      data: {
        id_produit: d.productId,
        id_entrepot: d.warehouseId,
        quantite_en_stock: qty,
        quantite_reservee: reserved,
        quantite_commandee: ordered,
      },
    })

    return {
      data: {
        id_stock: stockLevel.id_stock,
        id_produit: stockLevel.id_produit,
        id_entrepot: stockLevel.id_entrepot,
        quantite_en_stock: Number(stockLevel.quantite_en_stock),
        quantite_reservee: Number(stockLevel.quantite_reservee),
        quantite_commandee: Number(stockLevel.quantite_commandee),
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
  if (result.error) {
    return { error: result.error, code: result.code }
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

export async function listArticles(
  page: number = 1,
  limit: number = 50,
  filters?: {
    search?: string
    categorie?: number
    famille?: string
    actif?: boolean
  },
  sort: string = 'nom_produit',
  order: 'asc' | 'desc' = 'asc',
): Promise<PaginatedResult<ArticleWithStock> & { error?: string; code?: import('@/lib/service-result').ServiceErrorCode }> {
  const result = validatedOrError(paginationSchema, { page, limit }, { message: 'Paramètres de pagination invalides' })
  if (result.error) {
    return { ...createEmptyResult<ArticleWithStock>(page, limit, result.error), error: result.error, code: result.code }
  }
  const safePage = result.data?.page ?? page
  const safeLimit = result.data?.limit ?? limit
  const { skip } = getPaginationParams({ page: safePage, limit: safeLimit })

  const effectiveSort = ALLOWED_ARTICLE_SORT_FIELDS.includes(sort as AllowedArticleSortField)
    ? (sort as AllowedArticleSortField)
    : 'nom_produit'

  try {
    const where: Prisma.ProduitWhereInput = {}
    if (filters?.categorie) {
      where.id_categorie = filters.categorie
    }
    if (filters?.famille) {
      where.famille = filters.famille
    }
    if (filters?.actif !== undefined) {
      where.est_actif = filters.actif
    }
    if (filters?.search) {
      where.OR = [
        { nom_produit: { contains: filters.search, mode: 'insensitive' } },
        { code_produit: { contains: filters.search, mode: 'insensitive' } },
        { code_barre_ean: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    const [products, total] = await Promise.all([
      prisma.produit.findMany({
        skip,
        take: safeLimit,
        where,
        orderBy: { [effectiveSort]: order },
      }),
      prisma.produit.count({ where }),
    ])

    return {
      data: products as unknown as ArticleWithStock[],
      meta: buildPaginationMeta(total, safePage, safeLimit),
    }
  } catch (error) {
    log.error({ error }, 'Échec de la récupération des articles')
    return { ...createEmptyResult<ArticleWithStock>(safePage, safeLimit, 'Échec de la récupération des articles'), ...serviceError('Échec de la récupération des articles', 'INTERNAL') }
  }
}

export async function getArticleById(
  id_produit: number,
): Promise<{ data?: ArticleWithStock | null; error?: string; code?: import('@/lib/service-result').ServiceErrorCode }> {
  const result = validatedOrError(getArticleByIdSchema, { id_produit }, { message: 'ID d\'article invalide' })
  if (result.error) {
    return { error: result.error, code: result.code }
  }

  try {
    const product = await prisma.produit.findUnique({
      where: { id_produit },
    })

    if (!product) {
      return { data: null, ...serviceError('Article introuvable', 'NOT_FOUND') }
    }

    const productIds = [product.id_produit]
    const stockMap = await getStockAggregates(productIds)

    const article: ArticleWithStock = {
      id_produit: product.id_produit,
      code_produit: product.code_produit,
      nom_produit: product.nom_produit,
      famille: product.famille || null,
      id_categorie: product.id_categorie,
      description_produit: product.description_produit,
      code_barre_ean: product.code_barre_ean,
      unite_mesure: product.unite_mesure,
      poids_kg: product.poids_kg,
      volume_m3: product.volume_m3,
      prix_achat: product.prix_achat,
      prix_dernier_achat: product.prix_dernier_achat,
      coefficient: product.coefficient,
      prix_vente: product.prix_vente,
      prix_gros: product.prix_gros,
      taux_tva: product.taux_tva,
      type_suivi_stock: product.type_suivi_stock,
      quantite_min_commande: product.quantite_min_commande,
      niveau_reappro_quantite: product.niveau_reappro_quantite,
      stock_minimum: product.stock_minimum,
      stock_maximum: product.stock_maximum,
      activer_suivi_stock: product.activer_suivi_stock,
      id_fournisseur_principal: product.id_fournisseur_principal,
      reference_fournisseur: product.reference_fournisseur,
      delai_livraison_fournisseur_jours: product.delai_livraison_fournisseur_jours,
      est_actif: product.est_actif,
      en_sommeil: product.en_sommeil,
      est_abandonne: product.est_abandonne,
      date_creation: product.date_creation,
      date_modification: product.date_modification,
      cree_par: product.cree_par,
      modifie_par: product.modifie_par,
      compte_general_vente: product.compte_general_vente,
      compte_general_achat: product.compte_general_achat,
      code_taxe_vente: product.code_taxe_vente,
      code_taxe_achat: product.code_taxe_achat,
      categorie: null,
      niveaux_stock: [],
      stock_global: stockMap.get(product.id_produit) || 0,
    }

    return { data: article }
  } catch (error) {
    log.error({ error, id_produit }, 'Échec de la récupération de l\'article')
    return serviceError('Échec de la récupération de l\'article', 'INTERNAL')
  }
}

export async function createArticle(
  input: ArticleCreateInput,
  userId: string,
): Promise<{ data?: ArticleWithStock; error?: string; code?: import('@/lib/service-result').ServiceErrorCode }> {
  const result = validatedOrError(articleCreateSchema, input)
  if (result.error) {
    return { error: result.error, code: result.code }
  }

  const validatedInput = result.data

  try {
    const existing = await prisma.produit.findUnique({
      where: { code_produit: validatedInput.code_produit },
    })
    if (existing) {
      return serviceError(`L'article ${validatedInput.code_produit} existe déjà`, 'CONFLICT')
    }

    const product = await prisma.produit.create({
      data: {
        ...validatedInput,
        cree_par: userId,
      },
    })

    const article = product as unknown as ArticleWithStock
    return { data: article }
  } catch (error) {
    log.error({ error, input: validatedInput }, 'Échec de la création de l\'article')
    return serviceError('Échec de la création de l\'article', 'INTERNAL')
  }
}

export async function updateArticle(
  id_produit: number,
  input: ArticleUpdateInput,
  userId: string,
): Promise<{ data?: ArticleWithStock; error?: string; code?: import('@/lib/service-result').ServiceErrorCode }> {
  const result = validatedOrError(articleUpdateSchema, input)
  if (result.error) {
    return { error: result.error, code: result.code }
  }

  const validatedInput = result.data

  try {
    const existing = await prisma.produit.findUnique({
      where: { id_produit },
    })
    if (!existing) {
      return serviceError('Article introuvable', 'NOT_FOUND')
    }

    if (validatedInput.code_produit && validatedInput.code_produit !== existing.code_produit) {
      const duplicate = await prisma.produit.findUnique({
        where: { code_produit: validatedInput.code_produit },
      })
      if (duplicate) {
        return serviceError(`L'article ${validatedInput.code_produit} existe déjà`, 'CONFLICT')
      }
    }

    const product = await prisma.produit.update({
      where: { id_produit },
      data: {
        ...validatedInput,
        modifie_par: userId,
      },
    })

    const article = product as unknown as ArticleWithStock
    return { data: article }
  } catch (error) {
    log.error({ error, id_produit, input: validatedInput }, 'Échec de la mise à jour de l\'article')
    return serviceError('Échec de la mise à jour de l\'article', 'INTERNAL')
  }
}

export async function deleteArticle(
  id_produit: number,
  userId: string,
): Promise<{ data?: { success: boolean }; error?: string; code?: import('@/lib/service-result').ServiceErrorCode }> {
  const result = validatedOrError(deleteArticleSchema, { id_produit }, { message: 'ID d\'article invalide' })
  if (result.error) {
    return { error: result.error, code: result.code }
  }

  try {
    const existing = await prisma.produit.findUnique({
      where: { id_produit },
    })
    if (!existing) {
      return serviceError('Article introuvable', 'NOT_FOUND')
    }

    await prisma.produit.update({
      where: { id_produit },
      data: { est_actif: false, modifie_par: userId },
    })

    return { data: { success: true } }
  } catch (error) {
    log.error({ error, id_produit }, 'Échec de la suppression de l\'article')
    return serviceError('Échec de la suppression de l\'article', 'INTERNAL')
  }
}

export async function getStockLevelsByArticle(
  id_produit: number,
  page: number = 1,
  limit: number = 50,
): Promise<PaginatedResult<Record<string, unknown>> & { error?: string; code?: import('@/lib/service-result').ServiceErrorCode }> {
  const result = validatedOrError(getStockLevelsByArticleSchema, { id_produit }, { message: 'ID d\'article invalide' })
  if (result.error) {
    return { ...createEmptyResult(page, limit, result.error), data: [] as Record<string, unknown>[], error: result.error, code: result.code }
  }

  try {
    const product = await prisma.produit.findUnique({
      where: { id_produit },
    })
    if (!product) {
      return { ...createEmptyResult(page, limit, 'Article introuvable'), data: [] as Record<string, unknown>[], ...serviceError('Article introuvable', 'NOT_FOUND') }
    }

    const { skip } = getPaginationParams({ page, limit })

    const [stockLevels, total] = await Promise.all([
      prisma.niveauStock.findMany({
        where: { id_produit },
        skip,
        take: limit,
        orderBy: { date_creation: 'desc' },
        include: {
          entrepot: {
            select: { id_entrepot: true, code_entrepot: true, nom_entrepot: true },
          },
        },
      }),
      prisma.niveauStock.count({ where: { id_produit } }),
    ])

    return {
      data: stockLevels as unknown as Record<string, unknown>[],
      meta: buildPaginationMeta(total, page, limit),
    }
  } catch (error) {
    log.error({ error, id_produit }, 'Échec de la récupération des niveaux de stock')
    return { ...createEmptyResult(page, limit, 'Échec de la récupération des niveaux de stock'), data: [] as Record<string, unknown>[], ...serviceError('Échec de la récupération des niveaux de stock', 'INTERNAL') }
  }
}
