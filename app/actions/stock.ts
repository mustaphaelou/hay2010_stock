'use server'

import { prisma } from '@/lib/db/prisma'

export async function getStockLevels() {
    try {
        const stockQuery = await prisma.niveauStock.findMany({
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
                quantite_en_stock: 'asc'
            }
        })

        return stockQuery.map((stock: any) => ({
            ...stock,
            quantite_en_stock: Number(stock.quantite_en_stock || 0),
            quantite_reservee: Number(stock.quantite_reservee || 0),
            cout_moyen_pondere: stock.produit ? Number(stock.produit.prix_achat || 0) : 0,
            valeur_stock: stock.produit ? Number(stock.quantite_en_stock || 0) * Number(stock.produit.prix_achat || 0) : 0,
            produit: stock.produit ? {
                ...stock.produit,
                prix_achat: Number(stock.produit.prix_achat || 0)
            } : null,
            depot: stock.entrepot ? {
                ...stock.entrepot,
                nom_depot: stock.entrepot.nom_entrepot,
                id_depot: stock.entrepot.id_entrepot
            } : null
        }))
    } catch (error) {
        console.error('Failed to fetch stock levels:', error)
        return []
    }
}

export async function getDepots() {
    try {
        // de_cloture = false -> est_actif = true
        const depots = await prisma.entrepot.findMany({
            where: { est_actif: true },
            orderBy: { nom_entrepot: 'asc' }
        })
        return depots.map((depot: any) => ({
            ...depot,
            id_depot: depot.id_entrepot,
            nom_depot: depot.nom_entrepot
        }))
    } catch (error) {
        console.error('Failed to fetch depots:', error)
        return []
    }
}
