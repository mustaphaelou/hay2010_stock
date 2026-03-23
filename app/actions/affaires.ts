'use server'

import { prisma } from '@/lib/db/prisma'
import { requireAuth } from './auth'

export async function getAffaires() {
  await requireAuth()
  try {
        const affaires = await prisma.affaire.findMany({
            select: {
                code_affaire: true,
                intitule_affaire: true,
            },
            where: {
                est_actif: true
            },
            orderBy: {
                code_affaire: 'asc'
            }
        })
        return affaires.map((a: any) => a.code_affaire)
    } catch (error) {
        console.error('Failed to fetch affaires:', error)
        return []
    }
}

export async function getDocumentsByAffaire(code_affaire: string) {
  await requireAuth()
  try {
        const documents = await prisma.docVente.findMany({
            where: {
                numero_affaire: code_affaire
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

        // We parse Decimal fields to JS Numbers for client components
        return documents.map((doc: any) => ({
            ...doc,
            montant_ht: Number(doc.montant_ht || 0),
            montant_ttc: Number(doc.montant_ttc || 0),
            solde_du: Number(doc.solde_du || 0)
        }))
    } catch (error) {
        console.error('Failed to fetch documents for affaire:', error)
        return []
    }
}
