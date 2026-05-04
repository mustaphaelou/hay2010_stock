import { Prisma } from '@/lib/generated/prisma/client'
import type { DocumentWithComputed, DocumentLine, DocumentBase } from '@/lib/types'

export function mapDocumentToComputed(doc: DocumentBase): DocumentWithComputed {
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
    domaine: doc.domaine_document
  }
}

export function mapLineToDocumentLine(
  line: Record<string, unknown> & {
    numero_ligne: number
    quantite_commandee: Prisma.Decimal
    prix_unitaire_ht: Prisma.Decimal
    montant_ht: Prisma.Decimal
    montant_ttc: Prisma.Decimal
    nom_produit_snapshot: string | null
    code_produit_snapshot: string | null
    produit: { nom_produit: string } | null
  }
): DocumentLine {
  return {
    ...line,
    quantite: Number(line.quantite_commandee || 0),
    prix_unitaire: Number(line.prix_unitaire_ht || 0),
    montant_ht_num: Number(line.montant_ht || 0),
    montant_ttc_num: Number(line.montant_ttc || 0),
    designation: line.nom_produit_snapshot || line.produit?.nom_produit || null,
    reference_article: line.code_produit_snapshot || null,
    ordre: line.numero_ligne,
    code_taxe: null
  } as DocumentLine
}
