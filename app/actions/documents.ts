'use server'

import { requirePermission } from '@/lib/auth/authorization'
import { listDocuments, getDocLines as getLines } from '@/lib/documents/document-service'

export async function getDocuments(page: number = 1, limit: number = 50) {
  const user = await requirePermission('documents:read')
  return listDocuments({ page, limit }, user)
}

export async function getSalesDocuments(page: number = 1, limit: number = 50) {
  const user = await requirePermission('documents:read')
  return listDocuments({ page, limit, domaine: 'VENTE' }, user)
}

export async function getPurchasesDocuments(page: number = 1, limit: number = 50) {
  const user = await requirePermission('documents:read')
  return listDocuments({ page, limit, domaine: 'ACHAT' }, user)
}

export async function getDocLines(docId: number) {
  await requirePermission('documents:read')
  return getLines(docId)
}
