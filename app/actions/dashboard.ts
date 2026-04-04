'use server'

import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/user-utils'
import type { DashboardData, DashboardStats, SalesInvoice, DocumentBase } from '@/lib/types'
import { createLogger } from '@/lib/logger'

const log = createLogger('dashboard-actions')

export async function getDashboardStats(): Promise<DashboardData> {
  await requireAuth()

  try {
  const MAX_RECORDS = 100
  
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
    prisma.partenaire.count({ where: { type_partenaire: { in: ['CLIENT', 'LES_DEUX'] } } }),
    prisma.partenaire.count({ where: { type_partenaire: { in: ['FOURNISSEUR', 'LES_DEUX'] } } }),
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
        date_document: true,
        montant_ht: true,
        montant_remise_total: true,
        montant_tva_total: true
      },
      orderBy: {
        date_document: 'desc'
      },
      take: MAX_RECORDS
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

    const processedSalesInvoices: SalesInvoice[] = salesInvoices.map((s): SalesInvoice => ({
      montant_ttc: s.montant_ttc,
      solde_du: s.solde_du,
      date_document: s.date_document,
      montant_regle: Number(s.montant_ttc) - Number(s.solde_du)
    }))

    const processedRecentDocs: DocumentBase[] = recentDocs.map((doc): DocumentBase => ({
      id_document: doc.id_document,
      numero_document: doc.numero_document,
      type_document: doc.type_document,
      domaine_document: doc.domaine_document,
      etat_document: doc.etat_document,
      id_partenaire: doc.id_partenaire,
      nom_partenaire_snapshot: doc.nom_partenaire_snapshot,
      id_affaire: doc.id_affaire,
      numero_affaire: doc.numero_affaire,
      date_document: doc.date_document,
      date_echeance: doc.date_echeance,
      date_livraison: doc.date_livraison,
      date_livraison_prevue: doc.date_livraison_prevue,
      montant_ht: doc.montant_ht,
      montant_remise_total: doc.montant_remise_total,
      montant_tva_total: doc.montant_tva_total,
      montant_ttc: doc.montant_ttc,
      solde_du: doc.solde_du,
      code_devise: doc.code_devise,
      taux_change: doc.taux_change,
      statut_document: doc.statut_document,
      est_entierement_paye: doc.est_entierement_paye,
      id_entrepot: doc.id_entrepot,
      notes_internes: doc.notes_internes,
      notes_client: doc.notes_client,
      reference_externe: doc.reference_externe,
      date_creation: doc.date_creation,
      date_modification: doc.date_modification,
      cree_par: doc.cree_par,
      modifie_par: doc.modifie_par,
      mode_expedition: doc.mode_expedition,
      poids_total_brut: doc.poids_total_brut,
      nombre_colis: doc.nombre_colis,
      partenaire: doc.partenaire
    }))

    return {
      stats,
      recentDocs: processedRecentDocs,
      salesInvoices: processedSalesInvoices
    }
	} catch (error) {
		log.error({ error }, 'Failed to fetch dashboard stats')
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
