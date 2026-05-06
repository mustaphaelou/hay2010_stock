'use server'

import { requirePermission } from '@/lib/auth/authorization'
import { getAffaires as getAffairesList, getAffaireByCode as getAffaireByCodeService, getDocumentsByAffaire as getDocsByAffaire } from '@/lib/affaires/affaire-service'
import type { GetAffairesInput } from '@/lib/affaires/validation'

export async function getAffaires(page?: number, limit?: number, filters?: Partial<GetAffairesInput>) {
  await requirePermission('affairs:read')
  return getAffairesList(page, limit, filters)
}

export async function getAffaireByCode(code_affaire: string) {
  await requirePermission('affairs:read')
  return getAffaireByCodeService(code_affaire)
}

export async function getDocumentsByAffaire(code_affaire: string) {
  await requirePermission('affairs:read')
  return getDocsByAffaire(code_affaire)
}
