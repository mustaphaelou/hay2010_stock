'use server'

import { prisma } from '@/lib/db/prisma'
import { requireAuth } from './auth'
import { getPartnersSchema } from '@/lib/validation'
import type { PartnerWithComputed } from '@/lib/types'

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

    return partners.map((partner) => ({
      ...partner,
      plafond_credit: Number(partner.limite_credit || 0),
      solde_courant: 0
    }))
  } catch (error) {
    console.error('Failed to fetch partners:', error)
    return []
  }
}
