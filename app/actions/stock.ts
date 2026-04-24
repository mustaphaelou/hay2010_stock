'use server'

import { prisma } from '@/lib/db/prisma'
import { requirePermission } from '@/lib/auth/authorization'
import type { StockLevelWithProduct, Depot } from '@/lib/types'
import { createLogger } from '@/lib/logger'
import { paginationSchema } from '@/lib/validation'
import { VersionedCacheService, CacheNamespaces, CacheTTLSeconds } from '@/lib/cache/versioned'

const log = createLogger('stock-actions')

export async function getStockLevels(page: number = 1, limit: number = 50): Promise<{ data: StockLevelWithProduct[]; meta: { total: number; page: number; limit: number; totalPages: number }; error?: string }> {
  await requirePermission('stock:read')

  const parsed = paginationSchema.safeParse({ page, limit })
  if (!parsed.success) {
    return { data: [], meta: { total: 0, page, limit, totalPages: 0 }, error: 'Invalid pagination parameters' }
  }
  const { page: p, limit: l } = parsed.data ?? { page, limit }
  const safePage = p ?? page
  const safeLimit = l ?? limit
  const skip = (safePage - 1) * safeLimit

  try {
    const [stockQuery, total] = await Promise.all([
        prisma.niveauStock.findMany({
        skip,
        take: safeLimit,
        include: {
          produit: {
            select: {
              nom_produit: true,
              code_produit: true,
              prix_achat: true
            }
          },
          entrepot: {
            select: {
              nom_entrepot: true,
              id_entrepot: true
            }
          }
        },
        orderBy: {
          date_modification: 'desc'
        }
      }),
      prisma.niveauStock.count()
    ])

    return {
      data: stockQuery.map((stock): StockLevelWithProduct => {
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
            ? {
                nom_produit: produit.nom_produit,
                code_produit: produit.code_produit,
                prix_achat: produit.prix_achat
              }
            : null,
          entrepot: entrepot
            ? {
                nom_entrepot: entrepot.nom_entrepot,
                id_entrepot: entrepot.id_entrepot
              }
            : null
        }
      }),
        meta: {
          total,
          page: safePage,
          limit: safeLimit,
          totalPages: Math.ceil(total / safeLimit)
        }
      }
    } catch (error) {
      log.error({ error }, 'Failed to fetch stock levels')
      return {
        data: [],
        meta: { total: 0, page: safePage, limit: safeLimit, totalPages: 0 },
        error: 'Failed to fetch stock levels'
      }
    }
  }

  export async function getDepots(): Promise<Depot[]> {
    await requirePermission('stock:read')
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
