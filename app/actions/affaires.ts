'use server'

import { requirePermission } from '@/lib/auth/authorization'
import { getAffaires as getAffaireCodes, getDocumentsByAffaire as getDocsByAffaire } from '@/lib/affaires/affaire-service'

export async function getAffaires() {
  await requirePermission('affairs:read')
  return getAffaireCodes()
}

export async function getDocumentsByAffaire(code_affaire: string) {
  await requirePermission('affairs:read')
  return getDocsByAffaire(code_affaire)
}
