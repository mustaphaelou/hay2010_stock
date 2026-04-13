'use server'

import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/user-utils'
import { getDocLinesSchema } from '@/lib/validation'
import type { DocumentWithComputed, DocumentLine } from '@/lib/types'
import { Prisma } from '@/lib/generated/prisma/client'
import { createLogger } from '@/lib/logger'

const log = createLogger('documents-actions')

export type DocumentWithPartner = NonNullable<Awaited<ReturnType<typeof getDocuments>>>['data'][0]
export type DocumentLineType = NonNullable<Awaited<ReturnType<typeof getDocLines>>>['data'][0]

function mapDocumentToComputed(doc: {
  id_document: number
  numero_document: string
  type_document: string
  domaine_document: string
  etat_document: string
  id_partenaire: number
  nom_partenaire_snapshot: string | null
  id_affaire: number | null
  numero_affaire: string | null
  date_document: Date
  date_echeance: Date | null
  date_livraison: Date | null
  date_livraison_prevue: Date | null
  montant_ht: Prisma.Decimal
  montant_remise_total: Prisma.Decimal
  montant_tva_total: Prisma.Decimal
  montant_ttc: Prisma.Decimal
  solde_du: Prisma.Decimal
  code_devise: string
  taux_change: Prisma.Decimal
  statut_document: string
  est_entierement_paye: boolean
  id_entrepot: number | null
  notes_internes: string | null
  notes_client: string | null
  reference_externe: string | null
  date_creation: Date
  date_modification: Date
  cree_par: string | null
  modifie_par: string | null
  mode_expedition: string | null
  poids_total_brut: Prisma.Decimal | null
  nombre_colis: number | null
  partenaire: {
    nom_partenaire: string
    type_partenaire: string
  } | null
}): DocumentWithComputed {
  return {
    ...doc,
    montant_ht_num: Number(doc.montant_ht || 0),
    montant_ttc_num: Number(doc.montant_ttc || 0),
    solde_du_num: Number(doc.solde_du || 0),
    montant_regle: Number(doc.montant_ttc || 0) - Number(doc.solde_du || 0),
    numero_piece: doc.numero_document,
    nom_tiers: doc.nom_partenaire_snapshot || doc.partenaire?.nom_partenaire || null,
    reference: doc.reference_externe || null,
    montant_tva_num: Number(doc.montant_tva_total || 0),
    montant_remise_num: Number(doc.montant_remise_total || 0),
    type_document_num: Number(doc.type_document || 0),
    statut_document_num: Number(doc.statut_document || 0),
    domaine: doc.domaine_document
  }
}

export async function getDocuments(page: number = 1, limit: number = 50): Promise<{ data: DocumentWithComputed[]; meta: { total: number; page: number; limit: number; totalPages: number }; error?: string }> {
  const user = await requireAuth()
  const skip = (page - 1) * limit

  try {
    const whereClause = user.role === 'ADMIN' ? {} : { cree_par: user.id }
    
    const [documents, total] = await Promise.all([
      prisma.docVente.findMany({
        skip,
        take: limit,
        where: whereClause,
        include: {
          partenaire: {
            select: {
              nom_partenaire: true,
              type_partenaire: true
            }
          }
        },
        orderBy: {
          date_document: 'desc'
        }
      }),
      prisma.docVente.count({ where: whereClause })
    ])

    return {
      data: documents.map(mapDocumentToComputed),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
	} catch (error) {
		log.error({ error }, 'Failed to fetch documents')
		return {
      data: [], 
      meta: { total: 0, page, limit, totalPages: 0 },
      error: 'Failed to fetch documents'
    }
  }
}

export async function getSalesDocuments(page: number = 1, limit: number = 50): Promise<{ data: DocumentWithComputed[]; meta: { total: number; page: number; limit: number; totalPages: number }; error?: string }> {
  await requireAuth()
  
  const skip = (page - 1) * limit

  try {
    const [documents, total] = await Promise.all([
      prisma.docVente.findMany({
        skip,
        take: limit,
        where: {
          domaine_document: 'VENTE'
        },
        include: {
          partenaire: {
            select: {
              nom_partenaire: true,
              type_partenaire: true
            }
          }
        },
        orderBy: {
          date_document: 'desc'
        }
      }),
      prisma.docVente.count({ where: { domaine_document: 'VENTE' } })
    ])

    return {
      data: documents.map(mapDocumentToComputed),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
	} catch (error) {
		log.error({ error }, 'Failed to fetch sales documents')
		return {
      data: [], 
      meta: { total: 0, page, limit, totalPages: 0 },
      error: 'Failed to fetch sales documents'
    }
  }
}

export async function getPurchasesDocuments(page: number = 1, limit: number = 50): Promise<{ data: DocumentWithComputed[]; meta: { total: number; page: number; limit: number; totalPages: number }; error?: string }> {
  await requireAuth()
  
  const skip = (page - 1) * limit

  try {
    const [documents, total] = await Promise.all([
      prisma.docVente.findMany({
        skip,
        take: limit,
        where: {
          domaine_document: 'ACHAT'
        },
        include: {
          partenaire: {
            select: {
              nom_partenaire: true,
              type_partenaire: true
            }
          }
        },
        orderBy: {
          date_document: 'desc'
        }
      }),
      prisma.docVente.count({ where: { domaine_document: 'ACHAT' } })
    ])

    return {
      data: documents.map(mapDocumentToComputed),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
	} catch (error) {
		log.error({ error }, 'Failed to fetch purchases documents')
		return {
      data: [], 
      meta: { total: 0, page, limit, totalPages: 0 },
      error: 'Failed to fetch purchases documents'
    }
  }
}

export async function getDocLines(docId: number): Promise<{ data: DocumentLine[]; error?: string }> {
  await requireAuth()

	const validationResult = getDocLinesSchema.safeParse({ docId })
	if (!validationResult.success) {
		log.error({ error: validationResult.error, docId }, 'Invalid docId')
		return { data: [], error: 'Invalid document ID' }
  }

  try {
    const lines = await prisma.ligneDocument.findMany({
      where: { id_document: docId },
      include: {
        produit: {
          select: { nom_produit: true }
        }
      },
      orderBy: { numero_ligne: 'asc' }
    })

    return {
      data: lines.map((line): DocumentLine => ({
        ...line,
        quantite: Number(line.quantite_commandee || 0),
        prix_unitaire: Number(line.prix_unitaire_ht || 0),
        montant_ht_num: Number(line.montant_ht || 0),
        montant_ttc_num: Number(line.montant_ttc || 0),
        designation: line.nom_produit_snapshot || line.produit?.nom_produit || null,
        reference_article: line.code_produit_snapshot || null,
        ordre: line.numero_ligne,
        code_taxe: null
      }))
    }
	} catch (error) {
		log.error({ error, docId }, 'Failed to fetch document lines')
		return { data: [], error: 'Failed to fetch document lines' }
  }
}
