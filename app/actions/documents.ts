'use server'

import { prisma } from '@/lib/db/prisma'
import { requireAuth } from './auth'

export type DocumentWithPartner = NonNullable<Awaited<ReturnType<typeof getDocuments>>>[0]
export type DocumentLine = NonNullable<Awaited<ReturnType<typeof getDocLines>>>[0]

export async function getDocuments() {
  await requireAuth()
  
  try {
        const documents = await prisma.docVente.findMany({
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
        })

        return documents.map((doc: any) => ({
            ...doc,
            montant_ht: Number(doc.montant_ht || 0),
            montant_ttc: Number(doc.montant_ttc || 0),
            solde_du: Number(doc.solde_du || 0),
            montant_regle: Number(doc.montant_ttc || 0) - Number(doc.solde_du || 0),
            numero_piece: doc.numero_document,
            nom_tiers: doc.nom_partenaire_snapshot || doc.partenaire?.nom_partenaire,
            reference: doc.reference_externe,
            montant_tva: Number(doc.montant_tva_total || 0),
            montant_remise: Number(doc.montant_remise_total || 0),
            type_document: Number(doc.type_document || 0),
            statut_document: Number(doc.statut_document || 0),
            domaine: doc.domaine_document
        }))
    } catch (error) {
        console.error('Failed to fetch documents:', error)
        return []
    }
}

export async function getSalesDocuments() {
  await requireAuth()
  try {
        const documents = await prisma.docVente.findMany({
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
        })

        return documents.map((doc: any) => ({
            ...doc,
            montant_ht: Number(doc.montant_ht || 0),
            montant_ttc: Number(doc.montant_ttc || 0),
            solde_du: Number(doc.solde_du || 0),
            montant_regle: Number(doc.montant_ttc || 0) - Number(doc.solde_du || 0),
            numero_piece: doc.numero_document,
            nom_tiers: doc.nom_partenaire_snapshot || doc.partenaire?.nom_partenaire,
            reference: doc.reference_externe,
            montant_tva: Number(doc.montant_tva_total || 0),
            montant_remise: Number(doc.montant_remise_total || 0),
            type_document: Number(doc.type_document || 0),
            statut_document: Number(doc.statut_document || 0),
            domaine: doc.domaine_document
        }))
    } catch (error) {
        console.error('Failed to fetch sales documents:', error)
        return []
    }
}

export async function getPurchasesDocuments() {
  await requireAuth()
  try {
        const documents = await prisma.docVente.findMany({
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
        })

        return documents.map((doc: any) => ({
            ...doc,
            montant_ht: Number(doc.montant_ht || 0),
            montant_ttc: Number(doc.montant_ttc || 0),
            solde_du: Number(doc.solde_du || 0),
            montant_regle: Number(doc.montant_ttc || 0) - Number(doc.solde_du || 0),
            numero_piece: doc.numero_document,
            nom_tiers: doc.nom_partenaire_snapshot || doc.partenaire?.nom_partenaire,
            reference: doc.reference_externe,
            montant_tva: Number(doc.montant_tva_total || 0),
            montant_remise: Number(doc.montant_remise_total || 0),
            type_document: Number(doc.type_document || 0),
            statut_document: Number(doc.statut_document || 0),
            domaine: doc.domaine_document
        }))
    } catch (error) {
        console.error('Failed to fetch purchases documents:', error)
        return []
    }
}

export async function getDocLines(docId: number) {
  await requireAuth()
  try {
        const lines = await prisma.ligneDocument.findMany({
            where: {
                id_document: docId
            },
            include: {
                produit: {
                    select: {
                        nom_produit: true
                    }
                }
            },
            orderBy: {
                numero_ligne: 'asc'
            }
        })

        return lines.map((line: any) => ({
            ...line,
            quantite: Number(line.quantite_commandee || 0),
            prix_unitaire: Number(line.prix_unitaire_ht || 0),
            montant_ht: Number(line.montant_ht || 0),
            montant_ttc: Number(line.montant_ttc || 0),
            designation: line.nom_produit_snapshot || line.produit?.nom_produit,
            reference_article: line.code_produit_snapshot,
            ordre: line.numero_ligne,
            code_taxe: null
        }))
    } catch (error) {
        console.error('Failed to fetch document lines:', error)
        return []
    }
}
