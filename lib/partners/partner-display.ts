import { prisma } from '@/lib/db/prisma'

export function formatSoldeCourant(solde: number | null | undefined): string {
  if (solde === null || solde === undefined) return "0.00 Dhs"
  return `${solde} Dhs`
}

export function formatPlafondCredit(plafond: number | null | undefined): string {
  if (plafond === null || plafond === undefined) return "Non défini"
  return `${plafond} Dhs`
}

/**
 * Computes the current balance (solde courant) for a partner based on open sales documents.
 * 
 * Aggregation rules:
 * - Document Types included: 'Facture' (adds to balance) and 'Avoir' (subtracts from balance). Case-insensitive.
 * - Document Domaine: 'VENTE' (sales documents only).
 * - Document Statuses: Exclude drafts ('BROUILLON') and cancelled ('ANNULE').
 * - Only open documents with outstanding balance (solde_du > 0) are considered.
 * - Date Window: All-time outstanding (no date window constraint).
 * 
 * @param partnerId The ID of the partner
 * @returns The computed balance as a number
 */
export async function computePartnerBalance(partnerId: number): Promise<number> {
  try {
    const aggregations = await prisma.docVente.groupBy({
      by: ['type_document'],
      where: {
        id_partenaire: partnerId,
        domaine_document: 'VENTE',
        type_document: { in: ['Facture', 'Avoir', 'FACTURE', 'AVOIR'] },
        statut_document: { notIn: ['ANNULE', 'BROUILLON'] },
        solde_du: { gt: 0 }
      },
      _sum: {
        solde_du: true
      }
    })

    let balance = 0
    for (const agg of aggregations) {
      const sum = Number(agg._sum.solde_du || 0)
      const type = agg.type_document.toUpperCase()
      if (type === 'FACTURE') {
        balance += sum
      } else if (type === 'AVOIR') {
        balance -= sum
      }
    }
    return balance
  } catch (error) {
    console.error(`Error computing partner balance for ${partnerId}:`, error)
    return 0
  }
}
