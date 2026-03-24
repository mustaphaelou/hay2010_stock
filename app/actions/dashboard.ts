'use server'

import { prisma } from '@/lib/db/prisma'
import { requireAuth } from './auth'
import type { DashboardData, DashboardStats, SalesInvoice } from '@/lib/types'

export async function getDashboardStats(): Promise<DashboardData> {
  await requireAuth()

  try {
    const [
      clientsCount,
      suppliersCount,
      productsCount,
      familiesCount,
      salesCount,
      purchasesCount,
      recentDocs,
      salesInvoices
    ] = await Promise.all([
      prisma.partenaire.count({ where: { type_partenaire: 'CLIENT' } }),
      prisma.partenaire.count({ where: { type_partenaire: 'FOURNISSEUR' } }),
      prisma.produit.count(),
      prisma.categorieProduit.count(),
      prisma.docVente.count({ where: { domaine_document: 'VENTE' } }),
      prisma.docVente.count({ where: { domaine_document: 'ACHAT' } }),
      prisma.docVente.findMany({
        include: {
          partenaire: {
            select: {
              nom_partenaire: true,
              type_partenaire: true
            }
          }
        },
        orderBy: {
          date_creation: 'desc'
        },
        take: 5
      }),
      prisma.docVente.findMany({
        where: {
          domaine_document: 'VENTE',
          type_document: { in: ['Facture', 'Avoir'] }
        },
        select: {
          id_document: true,
          numero_document: true,
          type_document: true,
          domaine_document: true,
          montant_ttc: true,
          solde_du: true,
          date_document: true
        },
        take: 500
      })
    ])

    const stats: DashboardStats = {
      clients: clientsCount,
      suppliers: suppliersCount,
      products: productsCount,
      families: familiesCount,
      salesCount: salesCount,
      purchasesCount: purchasesCount
    }

    const processedSalesInvoices: SalesInvoice[] = salesInvoices.map((s) => ({
      ...s,
      montant_regle: Number(s.montant_ttc) - Number(s.solde_du)
    }))

    return {
      stats,
      recentDocs: recentDocs.map(doc => ({
        ...doc,
        type_document: String(doc.type_document)
      })),
      salesInvoices: processedSalesInvoices
    }
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error)
    return {
      stats: {
        clients: 0,
        suppliers: 0,
        products: 0,
        families: 0,
        salesCount: 0,
        purchasesCount: 0
      },
      recentDocs: [],
      salesInvoices: []
    }
  }
}
