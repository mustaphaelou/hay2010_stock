'use server'

import { prisma } from '@/lib/db/prisma'

export async function getPartners(type?: string) {
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
