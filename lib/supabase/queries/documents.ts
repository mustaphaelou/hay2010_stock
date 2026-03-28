'use server'

import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/app/actions/auth'

export type DocumentWithPartner = {
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
  montant_ht: number
  montant_remise_total: number
  montant_tva_total: number
  montant_ttc: number
  solde_du: number
  code_devise: string
  taux_change: number
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
  poids_total_brut: number | null
  nombre_colis: number | null
  partenaire?: { nom_partenaire: string }
}

export type LigneDocumentWithProduct = {
  id_ligne: number
  id_document: number
  numero_ligne: number
  id_affaire: number | null
  numero_affaire: string | null
  id_produit: number
  code_produit_snapshot: string | null
  nom_produit_snapshot: string | null
  quantite_commandee: number
  quantite_livree: number
  quantite_facturee: number
  prix_unitaire_ht: number
  pourcentage_remise: number
  taux_tva: number
  montant_remise: number
  montant_ht: number
  montant_tva: number
  montant_ttc: number
  statut_ligne: string
  notes_ligne: string | null
  id_lot: number | null
  date_creation: Date
  date_modification: Date
  produit?: { nom_produit: string; code_produit: string }
  document?: { numero_document: string; date_document: Date; type_document: string }
}

// Fetch all documents with partner name
export async function getDocuments() {
  await requireAuth()
  
  const data = await prisma.docVente.findMany({
    include: {
      partenaire: {
        select: { nom_partenaire: true }
      }
    },
    orderBy: { date_document: 'desc' }
  })

  return { 
    data: data.map(d => ({
      ...d,
      montant_ht: Number(d.montant_ht),
      montant_remise_total: Number(d.montant_remise_total),
      montant_tva_total: Number(d.montant_tva_total),
      montant_ttc: Number(d.montant_ttc),
      solde_du: Number(d.solde_du),
      taux_change: Number(d.taux_change),
      partenaire: d.partenaire ? { nom_partenaire: d.partenaire.nom_partenaire } : undefined
    })) as DocumentWithPartner[], 
    error: null 
  }
}

// Fetch document lines (useful for stock movements)
export async function getStockMovements() {
  await requireAuth()
  
  const data = await prisma.ligneDocument.findMany({
    include: {
      produit: { select: { nom_produit: true, code_produit: true } },
      document: { select: { numero_document: true, date_document: true, type_document: true } }
    },
    orderBy: { id_ligne: 'desc' }
  })

  return { 
    data: data.map(l => ({
      ...l,
      quantite_commandee: Number(l.quantite_commandee),
      quantite_livree: Number(l.quantite_livree),
      quantite_facturee: Number(l.quantite_facturee),
      prix_unitaire_ht: Number(l.prix_unitaire_ht),
      pourcentage_remise: Number(l.pourcentage_remise),
      taux_tva: Number(l.taux_tva),
      montant_remise: Number(l.montant_remise),
      montant_ht: Number(l.montant_ht),
      montant_tva: Number(l.montant_tva),
      montant_ttc: Number(l.montant_ttc),
      produit: l.produit ? { nom_produit: l.produit.nom_produit, code_produit: l.produit.code_produit } : undefined,
      document: l.document ? { numero_document: l.document.numero_document, date_document: l.document.date_document, type_document: l.document.type_document } : undefined
    })) as LigneDocumentWithProduct[], 
    error: null 
  }
}

// Fetch revenue over time
export async function getRevenueStats() {
  await requireAuth()
  
  const data = await prisma.docVente.findMany({
    where: { type_document: 'FACTURE' },
    select: { date_document: true, montant_ttc: true },
    orderBy: { date_document: 'asc' }
  })

  // Group by month
  const revenueByMonth = data.reduce((acc, d) => {
    const date = new Date(d.date_document)
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    acc[month] = (acc[month] || 0) + Number(d.montant_ttc)
    return acc
  }, {} as Record<string, number>)

  const chartData = Object.entries(revenueByMonth).map(([date, revenue]) => ({ date, revenue }))

  return { data: chartData, error: null }
}
