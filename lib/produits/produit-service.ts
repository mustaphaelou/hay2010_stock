import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@/lib/generated/prisma/client'
import { getAdapter } from '@/lib/cache/adapter'
import { CacheNamespaces, CacheTTLSeconds } from '@/lib/cache/cache'
import { createLogger } from '@/lib/logger'
import type { ArticleWithStock, StockStatusVariant } from '@/lib/types'
import { createEmptyResult, buildPaginationMeta, getPaginationParams } from '@/lib/pagination'
import type { PaginatedResult } from '@/lib/pagination'
import { paginationSchema } from '@/lib/pagination'
import {
  toggleArticleStatusSchema,
  articleCreateSchema,
  articleUpdateSchema,
  getArticleByIdSchema,
  deleteArticleSchema,
  getStockLevelsByArticleSchema,
  ALLOWED_ARTICLE_SORT_FIELDS,
} from '@/lib/produits/validation'
import type {
  ArticleCreateInput,
  ArticleUpdateInput,
  AllowedArticleSortField,
} from '@/lib/produits/validation'
import { serviceError, validatedOrError } from '@/lib/service-result'
import type { ServiceResult, ServiceErrorCode } from '@/lib/service-result'
import { createCrudService } from '@/lib/crud-service'
import type { Produit } from '@/lib/generated/prisma/client'

const log = createLogger('produit-service')

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

export function computeStockStatusVariant(stock: number, stockMinimum: number): StockStatusVariant {
  if (stock <= 0) return "destructive"
  if (stock <= stockMinimum) return "warning"
  return "success"
}

function mapProduitToArticleWithStock(
  product: Record<string, unknown>,
  stock_global: number,
): ArticleWithStock {
  return {
    id_produit: product.id_produit as number,
    code_produit: product.code_produit as string,
    nom_produit: product.nom_produit as string,
    famille: (product.famille as string) || (product.categorie as Record<string, unknown> | null)?.nom_categorie as string | null || null,
    id_categorie: product.id_categorie as number | null,
    description_produit: product.description_produit as string | null,
    code_barre_ean: product.code_barre_ean as string | null,
    unite_mesure: product.unite_mesure as string,
    poids_kg: product.poids_kg as Prisma.Decimal | null,
    volume_m3: product.volume_m3 as Prisma.Decimal | null,
    prix_achat: product.prix_achat as Prisma.Decimal | null,
    prix_dernier_achat: product.prix_dernier_achat as Prisma.Decimal | null,
    coefficient: product.coefficient as Prisma.Decimal | null,
    prix_vente: product.prix_vente as Prisma.Decimal | null,
    prix_gros: product.prix_gros as Prisma.Decimal | null,
    taux_tva: product.taux_tva as Prisma.Decimal | null,
    type_suivi_stock: product.type_suivi_stock as string | null,
    quantite_min_commande: product.quantite_min_commande as number | null,
    niveau_reappro_quantite: product.niveau_reappro_quantite as number | null,
    stock_minimum: product.stock_minimum as number | null,
    stock_maximum: product.stock_maximum as number | null,
    activer_suivi_stock: product.activer_suivi_stock as boolean,
    id_fournisseur_principal: product.id_fournisseur_principal as number | null,
    reference_fournisseur: product.reference_fournisseur as string | null,
    delai_livraison_fournisseur_jours: product.delai_livraison_fournisseur_jours as number | null,
    est_actif: product.est_actif as boolean,
    en_sommeil: product.en_sommeil as boolean,
    est_abandonne: product.est_abandonne as boolean,
    date_creation: product.date_creation as Date,
    date_modification: product.date_modification as Date,
    cree_par: product.cree_par as string | null,
    modifie_par: product.modifie_par as string | null,
    compte_general_vente: product.compte_general_vente as string | null,
    compte_general_achat: product.compte_general_achat as string | null,
    code_taxe_vente: product.code_taxe_vente as string | null,
    code_taxe_achat: product.code_taxe_achat as string | null,
    categorie: (product.categorie as Record<string, unknown> | null)
      ? {
          id_categorie: (product.categorie as Record<string, unknown>).id_categorie as number,
          code_categorie: (product.categorie as Record<string, unknown>).code_categorie as string,
          nom_categorie: (product.categorie as Record<string, unknown>).nom_categorie as string,
          description_categorie: (product.categorie as Record<string, unknown>).description_categorie as string | null,
          est_actif: (product.categorie as Record<string, unknown>).est_actif as boolean,
        }
      : null,
    niveaux_stock: (product.niveaux_stock as Array<Record<string, unknown>>)?.map((ns) => ({
      id_stock: ns.id_stock as number,
      id_produit: ns.id_produit as number,
      id_entrepot: ns.id_entrepot as number,
      quantite_en_stock: ns.quantite_en_stock as Prisma.Decimal,
      quantite_reservee: ns.quantite_reservee as Prisma.Decimal,
      quantite_commandee: ns.quantite_commandee as Prisma.Decimal,
      date_dernier_mouvement: ns.date_dernier_mouvement as Date | null,
      type_dernier_mouvement: ns.type_dernier_mouvement as string | null,
    })) ?? [],
    stock_global,
    stock_status_variant: computeStockStatusVariant(stock_global, (product.stock_minimum as number) ?? 0),
  }
}

const baseCrud = createCrudService<Produit, ArticleCreateInput, ArticleUpdateInput>({
  delegate: prisma.produit as any,
  entityName: 'Article',
  createSchema: articleCreateSchema,
  updateSchema: articleUpdateSchema,
  uniqueFields: ['code_produit'],
  idField: 'id_produit',
  createUserIdField: 'cree_par',
  updateUserIdField: 'modifie_par',
  conflictFormatter: (field, value) => `L'article ${value} existe déjà`,
})

// --- Standard CRUD via CrudService ---

export const ensureArticleExists = baseCrud.ensureExists

// --- Cached list with stock ---

export async function getArticlesWithStock(page: number = 1, limit: number = 50): Promise<PaginatedResult<ArticleWithStock> & { error?: string; code?: ServiceErrorCode }> {
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

    const data = result.map((article) =>
      mapProduitToArticleWithStock(article as unknown as Record<string, unknown>, stockMap.get(article.id_produit) || 0)
    )

    const response = { data, meta: buildPaginationMeta(total, page, limit) }

    await getAdapter().set(CacheNamespaces.PRODUCT, cacheKey, response, CacheTTLSeconds.PRODUCT)

    return response
  } catch (error) {
    log.error({ error }, 'Failed to fetch articles')
    return { ...createEmptyResult<ArticleWithStock>(page, limit, 'Failed to fetch articles'), ...serviceError('Failed to fetch articles', 'INTERNAL') }
  }
}

// --- Custom list with filters, search, sort, pagination ---

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
): Promise<PaginatedResult<ArticleWithStock> & { error?: string; code?: ServiceErrorCode }> {
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

    const productIds = products.map(a => a.id_produit)
    const stockMap = await getStockAggregates(productIds)

    const data: ArticleWithStock[] = products.map((article) =>
      mapProduitToArticleWithStock(article as unknown as Record<string, unknown>, stockMap.get(article.id_produit) || 0)
    )

    return {
      data,
      meta: buildPaginationMeta(total, safePage, safeLimit),
    }
  } catch (error) {
    log.error({ error }, 'Échec de la récupération des articles')
    return { ...createEmptyResult<ArticleWithStock>(safePage, safeLimit, 'Échec de la récupération des articles'), ...serviceError('Échec de la récupération des articles', 'INTERNAL') }
  }
}

// --- Wrap CrudService getById ---

export async function getArticleById(
  id_produit: number,
): Promise<ServiceResult<ArticleWithStock | null>> {
  const result = validatedOrError(getArticleByIdSchema, { id_produit }, { message: 'ID d\'article invalide' })
  if (result.error) {
    return { error: result.error, code: result.code }
  }

  try {
    const product = await prisma.produit.findUnique({
      where: { id_produit },
      include: { categorie: true },
    })

    if (!product) {
      return serviceError('Article introuvable', 'NOT_FOUND')
    }

    const stock_global = (await getStockAggregates([product.id_produit])).get(product.id_produit) || 0

    return { data: mapProduitToArticleWithStock(product as unknown as Record<string, unknown>, stock_global) }
  } catch (error) {
    log.error({ error, id_produit }, 'Échec de la récupération de l\'article')
    return serviceError('Échec de la récupération de l\'article', 'INTERNAL')
  }
}

// --- Create via CrudService with stock aggregate ---

export async function createArticle(
  input: ArticleCreateInput,
  userId: string,
): Promise<ServiceResult<ArticleWithStock>> {
  const result = await baseCrud.create(input, userId)
  if (result.error) {
    return result as ServiceResult<ArticleWithStock>
  }

  const product = result.data!
  const stock_global = (await getStockAggregates([product.id_produit])).get(product.id_produit) || 0
  return { data: mapProduitToArticleWithStock(product as unknown as Record<string, unknown>, stock_global) }
}

// --- Update via CrudService with stock aggregate ---

export async function updateArticle(
  id_produit: number,
  input: ArticleUpdateInput,
  userId: string,
): Promise<ServiceResult<ArticleWithStock>> {
  const result = await baseCrud.update(id_produit, input, userId)
  if (result.error) {
    return result as ServiceResult<ArticleWithStock>
  }

  const product = result.data!
  const stock_global = (await getStockAggregates([product.id_produit])).get(product.id_produit) || 0
  return { data: mapProduitToArticleWithStock(product as unknown as Record<string, unknown>, stock_global) }
}

// --- Custom soft delete ---

export async function deleteArticle(
  id_produit: number,
  userId: string,
): Promise<ServiceResult<{ success: boolean }>> {
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

// --- Domain-specific: toggle article status with lock contention ---

export async function toggleArticleStatus(
  id_produit: number,
  newStatus: boolean,
): Promise<{ data?: { success: boolean }; error?: string; code?: ServiceErrorCode }> {
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

// --- Domain-specific: stock levels for an article ---

export async function getStockLevelsByArticle(
  id_produit: number,
  page: number = 1,
  limit: number = 50,
): Promise<PaginatedResult<Record<string, unknown>> & { error?: string; code?: ServiceErrorCode }> {
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
