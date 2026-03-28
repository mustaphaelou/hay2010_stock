'use server'

import { prisma } from '@/lib/db/prisma'
import { revalidatePath } from 'next/cache'
import { requireAuth } from './auth'
import { toggleArticleStatusSchema } from '@/lib/validation'
import type { ArticleWithStock } from '@/lib/types'

export async function getArticlesWithStock(page: number = 1, limit: number = 50): Promise<{ data: ArticleWithStock[]; meta: { total: number; page: number; limit: number; totalPages: number }; error?: string }> {
  await requireAuth()
  
  const skip = (page - 1) * limit

  try {
    const [result, total] = await Promise.all([
      prisma.produit.findMany({
        skip,
        take: limit,
        include: {
          categorie: true,
          niveaux_stock: true,
        },
        orderBy: {
          nom_produit: 'asc'
        }
      }),
      prisma.produit.count()
    ])

    return {
      data: result.map((article: typeof result[0]) => {
        const totalStock = article.niveaux_stock.reduce(
          (acc: number, stock: typeof article.niveaux_stock[0]) => acc + Number(stock.quantite_en_stock || 0),
          0
        )

        return {
          ...article,
          stock_global: totalStock,
          prix_vente: article.prix_vente,
          prix_achat: article.prix_achat,
          coefficient: article.coefficient,
          famille: article.famille || article.categorie?.nom_categorie || null
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
  newStatus: boolean
): Promise<{ success?: boolean; error?: string }> {
  await requireAuth()

  const validationResult = toggleArticleStatusSchema.safeParse({ id_produit, newStatus })
  if (!validationResult.success) {
    return { error: 'Invalid input: ' + validationResult.error.issues.map((e: { message: string }) => e.message).join(', ') }
  }

  try {
    await prisma.produit.update({
      where: { id_produit },
      data: { en_sommeil: newStatus }
    })
    revalidatePath('/articles')
    return { success: true }
  } catch (error) {
    console.error('Failed to toggle article status:', error)
    return { error: 'Failed to update status' }
  }
}
