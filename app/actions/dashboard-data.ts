'use server'

import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/user-utils'
import { createLogger } from '@/lib/logger'

const log = createLogger('dashboard-data-actions')

export type DashboardProductData = {
  id_produit: number
  code_produit: string
  nom_produit: string
  prix_vente: number | null
  prix_achat: number | null
  stock_maximum: number | null
  niveau_reappro_quantite: number | null
  categories_produits?: { nom_categorie: string } | null
}

export type DashboardPartnerData = {
  id_partenaire: number
  code_partenaire: string
  nom_partenaire: string
  type_partenaire: string
  ville: string | null
  est_actif: boolean
}

export type DashboardDocumentData = {
  id_document: number
  numero_document: string
  date_document: Date
  type_document: string
  domaine_document: string
  montant_ttc: number
  montant_ht: number
  statut_document: string
  nom_partenaire_snapshot: string | null
  partenaire?: { nom_partenaire: string } | null
}

export type DashboardMovementData = {
  id: number
  date: string
  ref: string
  designation: string
  type: string
  document: string
  quantity: number
}

export type DashboardDataResult = {
  products: DashboardProductData[]
  partners: DashboardPartnerData[]
  documents: DashboardDocumentData[]
  movements: DashboardMovementData[]
}

export async function getDashboardData(): Promise<DashboardDataResult> {
  await requireAuth()

  try {
    // Fetch all data in parallel for better performance
    const [productsRaw, partnersRaw, documentsRaw, lignesRaw] = await Promise.all([
      prisma.produit.findMany({
        where: { est_actif: true },
        include: {
          categorie: {
            select: { nom_categorie: true }
          }
        },
        orderBy: { nom_produit: 'asc' },
        take: 100
      }),
      prisma.partenaire.findMany({
        orderBy: { nom_partenaire: 'asc' },
        take: 100
      }),
      prisma.docVente.findMany({
        include: {
          partenaire: {
            select: { nom_partenaire: true }
          }
        },
        orderBy: { date_document: 'desc' },
        take: 100
      }),
      prisma.ligneDocument.findMany({
        include: {
          produit: { select: { nom_produit: true, code_produit: true } },
          document: { select: { numero_document: true, date_document: true, type_document: true } }
        },
        orderBy: { id_ligne: 'desc' },
        take: 20
      })
    ])

    const products: DashboardProductData[] = productsRaw.map(p => ({
      id_produit: p.id_produit,
      code_produit: p.code_produit,
      nom_produit: p.nom_produit,
      prix_vente: p.prix_vente ? Number(p.prix_vente) : null,
      prix_achat: p.prix_achat ? Number(p.prix_achat) : null,
      stock_maximum: p.stock_maximum,
      niveau_reappro_quantite: p.niveau_reappro_quantite,
      categories_produits: p.categorie ? { nom_categorie: p.categorie.nom_categorie } : null
    }))

    const partners: DashboardPartnerData[] = partnersRaw.map(p => ({
      id_partenaire: p.id_partenaire,
      code_partenaire: p.code_partenaire,
      nom_partenaire: p.nom_partenaire,
      type_partenaire: p.type_partenaire,
      ville: p.ville,
      est_actif: p.est_actif
    }))

    const documents: DashboardDocumentData[] = documentsRaw.map(d => ({
      id_document: d.id_document,
      numero_document: d.numero_document,
      date_document: d.date_document,
      type_document: d.type_document,
      domaine_document: d.domaine_document,
      montant_ttc: Number(d.montant_ttc),
      montant_ht: Number(d.montant_ht),
      statut_document: d.statut_document,
      nom_partenaire_snapshot: d.nom_partenaire_snapshot,
      partenaire: d.partenaire ? { nom_partenaire: d.partenaire.nom_partenaire } : null
    }))

    const movements: DashboardMovementData[] = lignesRaw.map(m => {
      const doc = m.document
      const produit = m.produit
      const typeDoc = doc?.type_document || ''
      const qty = Number(m.quantite_livree)
      
      let movementType = 'Ajustement'
      if (typeDoc === 'LIVRAISON') {
        movementType = qty > 0 ? 'Entrée' : 'Sortie'
      } else if (typeDoc === 'FACTURE') {
        movementType = 'Sortie'
      }

      return {
        id: m.id_ligne,
        date: doc?.date_document ? new Date(doc.date_document).toLocaleDateString('fr-FR') : '',
        ref: produit?.code_produit || '',
        designation: produit?.nom_produit || '',
        type: movementType,
        document: doc?.numero_document || '',
        quantity: qty
      }
    })

    return { products, partners, documents, movements }
	} catch (error) {
		log.error({ error }, 'Failed to fetch dashboard data')
		return { products: [], partners: [], documents: [], movements: [] }
  }
}
