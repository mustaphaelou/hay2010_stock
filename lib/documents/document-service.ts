import { prisma } from '@/lib/db/prisma'
import { paginationSchema } from '@/lib/pagination'
import {
  getDocLinesSchema,
  documentCreateSchema,
  documentUpdateSchema,
  getDocumentByIdSchema,
  deleteDocumentSchema,
  ALLOWED_DOCUMENT_SORT_FIELDS,
} from '@/lib/documents/validation'
import type {
  DocumentCreateInput,
  DocumentUpdateInput,
  DocumentListParams,
  AllowedDocumentSortField,
} from '@/lib/documents/validation'
import type { DocumentWithComputed, DocumentLine } from '@/lib/types'
import { createLogger } from '@/lib/logger'
import { createEmptyResult, buildPaginationMeta, getPaginationParams } from '@/lib/pagination'
import type { PaginatedResult } from '@/lib/pagination'
import { mapDocumentToComputed, mapLineToDocumentLine } from '@/lib/documents/mapping'
import { hasRole } from '@/lib/auth/authorization'
import type { UserRole } from '@/lib/auth/authorization'
import { Prisma } from '@/lib/generated/prisma/client'

const log = createLogger('document-service')

function applyRowLevelSecurity(user: { id: string; role: string }, whereClause: Record<string, unknown> = {}): Record<string, unknown> {
  if (hasRole(user.role as UserRole, 'ADMIN')) return whereClause
  return { ...whereClause, cree_par: user.id }
}

export async function listDocuments(
  params: DocumentListParams,
  user: { id: string; role: string }
): Promise<PaginatedResult<DocumentWithComputed> & { error?: string }> {
  const parsed = paginationSchema.safeParse({ page: params.page, limit: params.limit })
  if (!parsed.success) {
    return createEmptyResult<DocumentWithComputed>(params.page, params.limit, 'Paramètres de pagination invalides')
  }
  const safePage = parsed.data?.page ?? params.page
  const safeLimit = parsed.data?.limit ?? params.limit
  const { skip } = getPaginationParams({ page: safePage, limit: safeLimit })

  const effectiveSort = ALLOWED_DOCUMENT_SORT_FIELDS.includes(params.sort as AllowedDocumentSortField)
    ? (params.sort as AllowedDocumentSortField)
    : 'date_document'
  const effectiveOrder = params.order === 'asc' ? ('asc' as const) : ('desc' as const)

  try {
    const where: Prisma.DocVenteWhereInput = {}
    if (params.domaine) {
      where.domaine_document = params.domaine
    }
    if (params.type_document) {
      where.type_document = params.type_document
    }
    if (params.statut_document) {
      where.statut_document = params.statut_document
    }
    if (params.id_partenaire) {
      where.id_partenaire = params.id_partenaire
    }
    if (params.id_affaire) {
      where.id_affaire = params.id_affaire
    }
    if (params.search) {
      where.OR = [
        { numero_document: { contains: params.search, mode: 'insensitive' } },
        { nom_partenaire_snapshot: { contains: params.search, mode: 'insensitive' } },
        { reference_externe: { contains: params.search, mode: 'insensitive' } },
      ]
    }

    const whereClause = applyRowLevelSecurity(user, where)

    const [documents, total] = await Promise.all([
      prisma.docVente.findMany({
        skip,
        take: safeLimit,
        where: whereClause,
        include: {
          partenaire: {
            select: {
              nom_partenaire: true,
              type_partenaire: true,
            },
          },
          _count: {
            select: { lignes: true },
          },
        },
        orderBy: { [effectiveSort]: effectiveOrder },
      }),
      prisma.docVente.count({ where: whereClause }),
    ])

    return {
      data: documents.map(mapDocumentToComputed) as DocumentWithComputed[],
      meta: buildPaginationMeta(total, safePage, safeLimit),
    }
  } catch (error) {
    log.error({ error }, 'Échec de la récupération des documents')
    return createEmptyResult<DocumentWithComputed>(safePage, safeLimit, 'Échec de la récupération des documents')
  }
}

export async function getDocumentById(
  id_document: number,
): Promise<{ data?: Record<string, unknown> | null; error?: string }> {
  const validationResult = getDocumentByIdSchema.safeParse({ id_document })
  if (!validationResult.success) {
    return { error: 'ID de document invalide' }
  }

  try {
    const document = await prisma.docVente.findUnique({
      where: { id_document },
      include: {
        lignes: true,
        partenaire: {
          select: { id_partenaire: true, code_partenaire: true, nom_partenaire: true },
        },
      },
    })

    if (!document) {
      return { data: null, error: 'Document introuvable' }
    }

    return { data: document as unknown as Record<string, unknown> }
  } catch (error) {
    log.error({ error, id_document }, 'Échec de la récupération du document')
    return { error: 'Échec de la récupération du document' }
  }
}

export async function createDocument(
  input: DocumentCreateInput,
  userId: string,
): Promise<{ data?: DocumentWithComputed; error?: string }> {
  const validationResult = documentCreateSchema.safeParse(input)
  if (!validationResult.success) {
    return { error: 'Validation échouée: ' + validationResult.error.issues.map((e) => e.message).join(', ') }
  }

  const validatedInput = validationResult.data

  try {
    const existing = await prisma.docVente.findUnique({
      where: { numero_document: validatedInput.numero_document },
    })
    if (existing) {
      return { error: `Le document ${validatedInput.numero_document} existe déjà` }
    }

    const partner = await prisma.partenaire.findUnique({
      where: { id_partenaire: validatedInput.id_partenaire },
    })
    if (!partner) {
      return { error: 'Partenaire introuvable' }
    }

    const { id_partenaire, id_affaire, id_entrepot, ...rest } = validatedInput

    const document = await prisma.docVente.create({
      data: {
        ...rest,
        id_partenaire,
        ...(id_affaire ? { id_affaire } : {}),
        ...(id_entrepot ? { id_entrepot } : {}),
        cree_par: userId,
      },
    })

    return { data: mapDocumentToComputed(document as unknown as Parameters<typeof mapDocumentToComputed>[0]) }
  } catch (error) {
    log.error({ error, input: validatedInput }, 'Échec de la création du document')
    return { error: 'Échec de la création du document' }
  }
}

export async function updateDocument(
  id_document: number,
  input: DocumentUpdateInput,
  userId: string,
): Promise<{ data?: DocumentWithComputed; error?: string }> {
  const validationResult = documentUpdateSchema.safeParse(input)
  if (!validationResult.success) {
    return { error: 'Validation échouée: ' + validationResult.error.issues.map((e) => e.message).join(', ') }
  }

  const validatedInput = validationResult.data

  try {
    const existing = await prisma.docVente.findUnique({
      where: { id_document },
    })
    if (!existing) {
      return { error: 'Document introuvable' }
    }

    if (validatedInput.numero_document && validatedInput.numero_document !== existing.numero_document) {
      const duplicate = await prisma.docVente.findUnique({
        where: { numero_document: validatedInput.numero_document },
      })
      if (duplicate) {
        return { error: `Le document ${validatedInput.numero_document} existe déjà` }
      }
    }

    const document = await prisma.docVente.update({
      where: { id_document },
      data: {
        ...validatedInput,
        modifie_par: userId,
      },
    })

    return { data: mapDocumentToComputed(document as unknown as Parameters<typeof mapDocumentToComputed>[0]) }
  } catch (error) {
    log.error({ error, id_document, input: validatedInput }, 'Échec de la mise à jour du document')
    return { error: 'Échec de la mise à jour du document' }
  }
}

export async function deleteDocument(
  id_document: number,
  userId: string,
): Promise<{ data?: { success: boolean }; error?: string }> {
  const validationResult = deleteDocumentSchema.safeParse({ id_document })
  if (!validationResult.success) {
    return { error: 'ID de document invalide' }
  }

  try {
    const existing = await prisma.docVente.findUnique({
      where: { id_document },
    })
    if (!existing) {
      return { error: 'Document introuvable' }
    }

    await prisma.docVente.update({
      where: { id_document },
      data: { statut_document: 'ANNULE', modifie_par: userId },
    })

    return { data: { success: true } }
  } catch (error) {
    log.error({ error, id_document }, 'Échec de la suppression du document')
    return { error: 'Échec de la suppression du document' }
  }
}

export async function getDocumentLinesById(
  id_document: number,
  page: number = 1,
  limit: number = 50,
): Promise<PaginatedResult<Record<string, unknown>> & { error?: string }> {
  try {
    const document = await prisma.docVente.findUnique({
      where: { id_document },
    })
    if (!document) {
      return { ...createEmptyResult(page, limit, 'Document introuvable'), data: [] }
    }

    const { skip } = getPaginationParams({ page, limit })

    const [lines, total] = await Promise.all([
      prisma.ligneDocument.findMany({
        where: { id_document },
        skip,
        take: limit,
        orderBy: { numero_ligne: 'asc' },
      }),
      prisma.ligneDocument.count({ where: { id_document } }),
    ])

    return {
      data: lines as unknown as Record<string, unknown>[],
      meta: buildPaginationMeta(total, page, limit),
    }
  } catch (error) {
    log.error({ error, id_document }, 'Échec de la récupération des lignes')
    return { ...createEmptyResult(page, limit, 'Échec de la récupération des lignes'), data: [] as Record<string, unknown>[] }
  }
}

export async function getDocLines(docId: number): Promise<{ data: DocumentLine[]; error?: string }> {
  const validationResult = getDocLinesSchema.safeParse({ docId })
  if (!validationResult.success) {
    log.error({ error: validationResult.error, docId }, 'docId invalide')
    return { data: [], error: 'ID de document invalide' }
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
    log.error({ error, docId }, 'Échec de la récupération des lignes')
    return { data: [], error: 'Échec de la récupération des lignes' }
  }
}
