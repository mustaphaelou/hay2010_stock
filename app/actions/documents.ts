'use server'

import { requirePermission } from '@/lib/auth/authorization'
import { getFilteredDocuments, getDocLines as getLines } from '@/lib/documents/document-service'

export async function getDocuments(page: number = 1, limit: number = 50) {
  const user = await requirePermission('documents:read')
  return getFilteredDocuments(user, page, limit)
}

export async function getSalesDocuments(page: number = 1, limit: number = 50) {
  const user = await requirePermission('documents:read')
  return getFilteredDocuments(user, page, limit, 'VENTE')
}

export async function getPurchasesDocuments(page: number = 1, limit: number = 50) {
  const user = await requirePermission('documents:read')
  return getFilteredDocuments(user, page, limit, 'ACHAT')
}

export async function getDocLines(docId: number) {
  await requirePermission('documents:read')
  return getLines(docId)
}
