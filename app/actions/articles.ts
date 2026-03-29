'use server'

import { prisma } from '@/lib/db/prisma'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth/authorization'
import { toggleArticleStatusSchema } from '@/lib/validation'
import type { ArticleWithStock } from '@/lib/types'
import { CacheService, CacheKeys, CacheTTL } from '@/lib/db/redis-cluster'
import { CacheInvalidationService } from '@/lib/cache/invalidation'
import { Prisma } from '@/lib/generated/prisma/client'

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

export async function getArticlesWithStock(page: number = 1, limit: number = 50): Promise<{ data: ArticleWithStock[]; meta: { total: number; page: number; limit: number; totalPages: number }; error?: string }> {
  await requirePermission('stock:read')

  if (limit > 100) limit = 100

  const cacheKey = `${CacheKeys.PRODUCT}list:${page}:${limit}`

  try {
    const cached = await CacheService.get<{
      data: ArticleWithStock[]
      meta: { total: number; page: number; limit: number; totalPages: number }
    }>(cacheKey)

    if (cached) {
      return cached
    }

    const skip = (page - 1) * limit

    const [result, total] = await Promise.all([
      prisma.produit.findMany({
        skip,
        take: limit,
        include: {
          categorie: true,
        },
        orderBy: {
          nom_produit: 'asc'
        }
      }),
      prisma.produit.count()
    ])

    const productIds = result.map(a => a.id_produit)
    const stockMap = await getStockAggregates(productIds)

    const data = result.map((article) => {
      return {
        ...article,
        stock_global: stockMap.get(article.id_produit) || 0,
        prix_vente: article.prix_vente,
        prix_achat: article.prix_achat,
        coefficient: article.coefficient,
        famille: article.famille || article.categorie?.nom_categorie || null
      }
    })

    const response = {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }

    await CacheService.set(cacheKey, response, CacheTTL.PRODUCT)

    return response
  } catch (error) {
    console.error('Failed to fetch articles:', error)
    return {
      data: [],
      meta: { total: 0, page, limit, totalPages: 0 },
      error: 'Failed to fetch articles'
    }
  }
}

export async function toggleArticleStatus(
  id_produit: number,
  newStatus: boolean,
  csrfToken: string
): Promise<{ success?: boolean; error?: string }> {
  const user = await requirePermission('stock:write')

  try {
    const { requireCsrfToken } = await import('@/lib/security/csrf')
    await requireCsrfToken(user.id, csrfToken)
  } catch {
    return { error: 'Invalid security token. Please refresh the page and try again.' }
  }

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

    revalidatePath('/articles')
    return { success: true }
  } catch (error) {
    console.error('Failed to toggle article status:', error)
    return { error: 'Failed to update status' }
  } finally {
    await CacheService.releaseLock(`article:${id_produit}`, lockToken)
  }
}
