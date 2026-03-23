'use server'

import { prisma } from '@/lib/db/prisma'
import { requireAuth } from './auth'

export async function getPartners(type?: string) {
  await requireAuth()
  try {
        const whereClause = type && type !== 'all' ? { type_partenaire: type } : {}
        const partners = await prisma.partenaire.findMany({
            where: whereClause,
            orderBy: {
                nom_partenaire: 'asc'
            }
        })

        return partners.map((partner: any) => ({
            ...partner,
            plafond_credit: Number(partner.limite_credit || 0),
            solde_courant: 0
        }))
    } catch (error) {
        console.error('Failed to fetch partners:', error)
        return []
    }
}
