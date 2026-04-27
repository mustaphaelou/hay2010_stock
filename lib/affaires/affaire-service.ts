import { prisma } from '@/lib/db/prisma'
import { getDocumentsByAffaireSchema } from '@/lib/documents/validation'
import type { DocumentBase } from '@/lib/types'
import { createLogger } from '@/lib/logger'

const log = createLogger('affaire-service')

export async function getAffaires(): Promise<string[]> {
  try {
    const affaires = await prisma.affaire.findMany({
      select: { code_affaire: true, intitule_affaire: true },
      where: { est_actif: true },
      orderBy: { code_affaire: 'asc' }
    })
    return affaires.map((a: { code_affaire: string }) => a.code_affaire)
  } catch (error) {
    log.error({ error }, 'Failed to fetch affaires')
    return []
  }
}

export async function getDocumentsByAffaire(code_affaire: string): Promise<DocumentBase[]> {
  const validationResult = getDocumentsByAffaireSchema.safeParse({ code_affaire })
  if (!validationResult.success) {
    log.error({ error: validationResult.error, code_affaire }, 'Invalid affaire code')
    return []
  }

  try {
    const documents = await prisma.docVente.findMany({
      where: { numero_affaire: code_affaire },
      include: {
        partenaire: { select: { nom_partenaire: true, type_partenaire: true } }
      },
      orderBy: { date_document: 'desc' }
    })

    return documents.map((doc: typeof documents[0]) => ({
      ...doc,
      type_document: String(doc.type_document),
      montant_ht: doc.montant_ht,
      montant_ttc: doc.montant_ttc,
      solde_du: doc.solde_du
    }))
  } catch (error) {
    log.error({ error, code_affaire }, 'Failed to fetch documents for affaire')
    return []
  }
}
