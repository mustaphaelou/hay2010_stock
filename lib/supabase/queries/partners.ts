'use server'

import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/app/actions/auth'

export type PartnerData = {
  id_partenaire: number
  code_partenaire: string
  nom_partenaire: string
  type_partenaire: string
  adresse_email: string | null
  numero_telephone: string | null
  numero_fax: string | null
  url_site_web: string | null
  adresse_rue: string | null
  code_postal: string | null
  ville: string | null
  pays: string | null
  numero_tva: string | null
  numero_ice: string | null
  numero_rc: string | null
  delai_paiement_jours: number | null
  limite_credit: number | null
  pourcentage_remise: number | null
  numero_compte_bancaire: string | null
  code_banque: string | null
  numero_iban: string | null
  code_swift: string | null
  est_actif: boolean
  est_bloque: boolean
  date_creation: Date
  date_modification: Date
  cree_par: string | null
  modifie_par: string | null
  compte_collectif: string | null
  compte_auxiliaire: string | null
}

// Fetch all partners
export async function getPartners() {
  await requireAuth()
  
  const data = await prisma.partenaire.findMany({
    orderBy: { nom_partenaire: 'asc' }
  })

  return { 
    data: data.map(p => ({
      ...p,
      delai_paiement_jours: p.delai_paiement_jours,
      limite_credit: p.limite_credit ? Number(p.limite_credit) : null,
      pourcentage_remise: p.pourcentage_remise ? Number(p.pourcentage_remise) : null
    })) as PartnerData[], 
    error: null 
  }
}

// Fetch partners by type
export async function getPartnersByType(type: 'CLIENT' | 'FOURNISSEUR') {
  await requireAuth()
  
  const data = await prisma.partenaire.findMany({
    where: {
      OR: [
        { type_partenaire: type },
        { type_partenaire: 'LES_DEUX' }
      ]
    },
    orderBy: { nom_partenaire: 'asc' }
  })

  return { 
    data: data.map(p => ({
      ...p,
      limite_credit: p.limite_credit ? Number(p.limite_credit) : null,
      pourcentage_remise: p.pourcentage_remise ? Number(p.pourcentage_remise) : null
    })) as PartnerData[], 
    error: null 
  }
}

// Search partners by name or code
export async function searchPartners(searchTerm: string) {
  await requireAuth()
  
  const data = await prisma.partenaire.findMany({
    where: {
      OR: [
        { nom_partenaire: { contains: searchTerm, mode: 'insensitive' } },
        { code_partenaire: { contains: searchTerm, mode: 'insensitive' } }
      ]
    }
  })

  return { 
    data: data.map(p => ({
      ...p,
      limite_credit: p.limite_credit ? Number(p.limite_credit) : null,
      pourcentage_remise: p.pourcentage_remise ? Number(p.pourcentage_remise) : null
    })) as PartnerData[], 
    error: null 
  }
}
