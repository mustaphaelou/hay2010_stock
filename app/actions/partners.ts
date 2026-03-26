'use server'

import { prisma } from '@/lib/db/prisma'
import { requireAuth } from './auth'
import { getPartnersSchema } from '@/lib/validation'
import type { PartnerWithComputed } from '@/lib/types'
import { Prisma } from '@/lib/generated/prisma/client'

export async function getPartners(type?: string): Promise<PartnerWithComputed[]> {
  await requireAuth()

  const validationResult = getPartnersSchema.safeParse({ type })
  if (!validationResult.success) {
    console.error('Invalid partners filter:', validationResult.error)
    return []
  }

  try {
    const whereClause = type && type !== 'all' ? { type_partenaire: type } : {}
    const partners = await prisma.partenaire.findMany({
      where: whereClause,
      orderBy: {
        nom_partenaire: 'asc'
      }
    })

    return partners.map((partner: typeof partners[0]) => ({
      id_partenaire: partner.id_partenaire,
      code_partenaire: partner.code_partenaire,
      nom_partenaire: partner.nom_partenaire,
      type_partenaire: partner.type_partenaire,
      adresse_email: partner.adresse_email,
      numero_telephone: partner.numero_telephone,
      numero_fax: partner.numero_fax,
      url_site_web: partner.url_site_web,
      adresse_rue: partner.adresse_rue,
      code_postal: partner.code_postal,
      ville: partner.ville,
      pays: partner.pays,
      numero_tva: partner.numero_tva,
      numero_ice: partner.numero_ice,
      numero_rc: partner.numero_rc,
      delai_paiement_jours: partner.delai_paiement_jours,
      limite_credit: partner.limite_credit,
      pourcentage_remise: partner.pourcentage_remise ?? new Prisma.Decimal(0),
      numero_compte_bancaire: partner.numero_compte_bancaire,
      code_banque: partner.code_banque,
      numero_iban: partner.numero_iban,
      code_swift: partner.code_swift,
      est_actif: partner.est_actif,
      est_bloque: partner.est_bloque,
      date_creation: partner.date_creation,
      date_modification: partner.date_modification,
      cree_par: partner.cree_par,
      modifie_par: partner.modifie_par,
      compte_collectif: partner.compte_collectif,
      compte_auxiliaire: partner.compte_auxiliaire,
      // Computed fields
      plafond_credit: Number(partner.limite_credit ?? 0),
      solde_courant: 0
    }))
  } catch (error) {
    console.error('Failed to fetch partners:', error)
    return []
  }
}
