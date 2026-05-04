import { prisma } from '@/lib/db/prisma'
import { paginationSchema } from '@/lib/validation'
import { getDocLinesSchema } from '@/lib/documents/validation'
import type { DocumentWithComputed, DocumentLine } from '@/lib/types'
import { createLogger } from '@/lib/logger'
import { createEmptyResult, buildPaginationMeta, getPaginationParams } from '@/lib/pagination'
import type { PaginatedResult } from '@/lib/pagination'
import { mapDocumentToComputed, mapLineToDocumentLine } from '@/lib/documents/mapping'

const log = createLogger('document-service')

function applyRowLevelSecurity(user: { id: string; role: string }, whereClause: Record<string, unknown> = {}): Record<string, unknown> {
  if (user.role === 'ADMIN') return whereClause
  return { ...whereClause, cree_par: user.id }
}

export async function getFilteredDocuments(
  user: { id: string; role: string },
  page: number,
  limit: number,
  domaine?: 'VENTE' | 'ACHAT'
): Promise<PaginatedResult<DocumentWithComputed> & { error?: string }> {
  const parsed = paginationSchema.safeParse({ page, limit })
  if (!parsed.success) {
    return createEmptyResult<DocumentWithComputed>(page, limit, 'Invalid pagination parameters')
  }
  const safePage = parsed.data?.page ?? page
  const safeLimit = parsed.data?.limit ?? limit
  const { skip } = getPaginationParams({ page: safePage, limit: safeLimit })

  try {
    const baseWhere = domaine ? { domaine_document: domaine } : {}
    const whereClause = applyRowLevelSecurity(user, baseWhere)

    const [documents, total] = await Promise.all([
      prisma.docVente.findMany({
        skip,
        take: safeLimit,
        where: whereClause,
        include: {
          partenaire: {
            select: {
              nom_partenaire: true,
              type_partenaire: true
            }
          }
        },
        orderBy: { date_document: 'desc' }
      }),
      prisma.docVente.count({ where: whereClause })
    ])

    return {
      data: documents.map(mapDocumentToComputed),
      meta: buildPaginationMeta(total, safePage, safeLimit)
    }
  } catch (error) {
    const label = domaine === 'VENTE' ? 'sales' : domaine === 'ACHAT' ? 'purchases' : ''
    log.error({ error }, `Failed to fetch ${label} documents`)
    return createEmptyResult<DocumentWithComputed>(safePage, safeLimit, `Failed to fetch ${label} documents`)
  }
}

export async function getDocLines(docId: number): Promise<{ data: DocumentLine[]; error?: string }> {
  const validationResult = getDocLinesSchema.safeParse({ docId })
  if (!validationResult.success) {
    log.error({ error: validationResult.error, docId }, 'Invalid docId')
    return { data: [], error: 'Invalid document ID' }
  }

  try {
    const lines = await prisma.ligneDocument.findMany({
      where: { id_document: docId },
      include: {
        produit: { select: { nom_produit: true } }
      },
      orderBy: { numero_ligne: 'asc' }
    })

    return {
      data: lines.map(mapLineToDocumentLine)
    }
  } catch (error) {
    log.error({ error, docId }, 'Failed to fetch document lines')
    return { data: [], error: 'Failed to fetch document lines' }
  }
}
