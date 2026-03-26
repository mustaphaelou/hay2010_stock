'use server'

import { prisma } from '@/lib/db/prisma'
import { requireAuth } from './auth'
import { getDocumentsByAffaireSchema } from '@/lib/validation'
import type { DocumentBase } from '@/lib/types'

export async function getAffaires(): Promise<string[]> {
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
    return affaires.map((a: { code_affaire: string }) => a.code_affaire)
  } catch (error) {
    console.error('Failed to fetch affaires:', error)
    return []
  }
}

export async function getDocumentsByAffaire(code_affaire: string): Promise<DocumentBase[]> {
  await requireAuth()

  const validationResult = getDocumentsByAffaireSchema.safeParse({ code_affaire })
  if (!validationResult.success) {
    console.error('Invalid affaire code:', validationResult.error)
    return []
  }

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

    return documents.map((doc: typeof documents[0]) => ({
      ...doc,
      type_document: String(doc.type_document),
      montant_ht: doc.montant_ht,
      montant_ttc: doc.montant_ttc,
      solde_du: doc.solde_du
    }))
  } catch (error) {
    console.error('Failed to fetch documents for affaire:', error)
    return []
  }
}
