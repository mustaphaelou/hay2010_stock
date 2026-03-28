'use server'

import { prisma } from '@/lib/db/prisma'
import { requireAuth } from './auth'
import type { StockLevelWithProduct, Depot } from '@/lib/types'

export async function getStockLevels(page: number = 1, limit: number = 50): Promise<{ data: StockLevelWithProduct[]; meta: { total: number; page: number; limit: number; totalPages: number }; error?: string }> {
  await requireAuth()
  
  const skip = (page - 1) * limit

  try {
    const [stockQuery, total] = await Promise.all([
      prisma.niveauStock.findMany({
        skip,
        take: limit,
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
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  } catch (error) {
    console.error('Failed to fetch stock levels:', error)
    return { 
      data: [], 
      meta: { total: 0, page, limit, totalPages: 0 },
      error: 'Failed to fetch stock levels'
    }
  }
}

export async function getDepots(): Promise<Depot[]> {
  await requireAuth()
  try {
    const depots = await prisma.entrepot.findMany({
      where: { est_actif: true },
      orderBy: { nom_entrepot: 'asc' }
    })
    return depots.map((depot): Depot => ({
      ...depot,
      id_depot: depot.id_entrepot,
      nom_depot: depot.nom_entrepot
    }))
  } catch (error) {
    console.error('Failed to fetch depots:', error)
    return []
  }
}
