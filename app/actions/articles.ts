'use server'

import { prisma } from '@/lib/db/prisma'
import { revalidatePath } from 'next/cache'

export async function getArticlesWithStock() {
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

        return result.map((article: any) => {
            // Aggregate stock from all warehouses
            const totalStock = article.niveaux_stock.reduce((acc: number, stock: any) => acc + Number(stock.quantite_en_stock || 0), 0)

            return {
                ...article,
                stock_global: totalStock,
                prix_vente: Number(article.prix_vente || 0),
                prix_achat: Number(article.prix_achat || 0),
                coefficient: Number(article.coefficient || 1),
                famille: article.famille || article.categorie?.nom_categorie || null
            }
        })
    } catch (error) {
        console.error('Failed to fetch articles:', error)
        return []
    }
}

export async function toggleArticleStatus(id_produit: number, newStatus: boolean) {
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
