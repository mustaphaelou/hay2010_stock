'use server'

import { prisma } from '@/lib/db/prisma'
import { revalidatePath } from 'next/cache'
import { requireAuth } from './auth'
import { toggleArticleStatusSchema } from '@/lib/validation'
import type { ArticleWithStock } from '@/lib/types'

export async function getArticlesWithStock(): Promise<ArticleWithStock[]> {
  await requireAuth()
  try {
    const result = await prisma.produit.findMany({
      include: {
        categorie: true,
        niveaux_stock: true,
      },
      orderBy: {
        nom_produit: 'asc'
      }
    })

  return result.map((article) => {
    const totalStock = article.niveaux_stock.reduce(
      (acc: number, stock) => acc + Number(stock.quantite_en_stock || 0),
      0
    )

    return {
      ...article,
      stock_global: totalStock,
      prix_vente: article.prix_vente ? Number(article.prix_vente) : null,
      prix_achat: article.prix_achat ? Number(article.prix_achat) : null,
      coefficient: article.coefficient ? Number(article.coefficient) : null,
      famille: article.famille || article.categorie?.nom_categorie || null
    }
  })
  } catch (error) {
    console.error('Failed to fetch articles:', error)
    return []
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
