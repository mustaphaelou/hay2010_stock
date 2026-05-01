import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getApiUser, requireApiKey } from '@/lib/api/auth'
import { apiSuccess, apiPaginated, apiCreated, apiNoContent, apiError } from '@/lib/api/response'
import {
  documentCreateSchema,
  documentUpdateSchema,
  paginationSchema,
} from '@/lib/api/validators/documents'
import { ValidationError, NotFoundError, ConflictError } from '@/lib/errors'
import { createValidationErrorFromZod } from '@/lib/errors'
import { CacheInvalidationService } from '@/lib/cache/invalidation'
import { Prisma } from '@/lib/generated/prisma/client'

const ALLOWED_SORT_FIELDS = [
  'id_document',
  'numero_document',
  'type_document',
  'domaine_document',
  'etat_document',
  'date_document',
  'montant_ht',
  'montant_ttc',
  'statut_document',
  'date_creation',
  'date_modification',
] as const

type AllowedSortField = (typeof ALLOWED_SORT_FIELDS)[number]

function extractIdFromUrl(request: NextRequest): number {
  const segments = request.nextUrl.pathname.split('/')
  const lastSegment = segments[segments.length - 1]
  const id = parseInt(lastSegment, 10)
  if (isNaN(id)) {
    throw new ValidationError('Invalid document ID')
  }
  return id
}

function parsePagination(request: NextRequest) {
  const url = request.nextUrl
  const page = parseInt(url.searchParams.get('page') || '1', 10)
  const limit = parseInt(url.searchParams.get('limit') || '50', 10)
  const parsed = paginationSchema.safeParse({ page, limit })
  if (!parsed.success) {
    throw createValidationErrorFromZod(parsed.error)
  }
  return parsed.data
}

async function getAuthenticatedUserId(request: NextRequest): Promise<string> {
  const apiUser = await getApiUser(request)
  if (!apiUser) return 'system'
  return apiUser.userId
}

export async function listDocumentsHandler(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const { page, limit } = parsePagination(request)
    const url = request.nextUrl
    const search = url.searchParams.get('search') || undefined
    const type = url.searchParams.get('type_document') || undefined
    const domaine = url.searchParams.get('domaine_document') || undefined
    const statut = url.searchParams.get('statut_document') || undefined
    const partner = url.searchParams.get('id_partenaire') || undefined
    const affaire = url.searchParams.get('id_affaire') || undefined
    const sortParam = url.searchParams.get('sort') || 'date_document'
    const orderParam = (url.searchParams.get('order') || 'desc').toLowerCase()

    const sort = ALLOWED_SORT_FIELDS.includes(sortParam as AllowedSortField)
      ? (sortParam as AllowedSortField)
      : 'date_document'
    const order = orderParam === 'desc' ? ('desc' as const) : ('asc' as const)

    const skip = (page - 1) * limit

    const where: Prisma.DocVenteWhereInput = {}
    if (type) {
      where.type_document = type
    }
    if (domaine) {
      where.domaine_document = domaine
    }
    if (statut) {
      where.statut_document = statut
    }
    if (partner) {
      where.id_partenaire = parseInt(partner, 10) || undefined
    }
    if (affaire) {
      where.id_affaire = parseInt(affaire, 10) || undefined
    }
    if (search) {
      where.OR = [
        { numero_document: { contains: search, mode: 'insensitive' } },
        { nom_partenaire_snapshot: { contains: search, mode: 'insensitive' } },
        { reference_externe: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [documents, total] = await Promise.all([
      prisma.docVente.findMany({
        skip,
        take: limit,
        where,
        orderBy: { [sort]: order },
        include: {
          lignes: { select: { id_ligne: true } },
        },
      }),
      prisma.docVente.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

    return apiPaginated(documents, {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    })
  } catch (error) {
    return apiError(error)
  }
}

export async function getDocumentByIdHandler(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const id = extractIdFromUrl(request)

    const document = await prisma.docVente.findUnique({
      where: { id_document: id },
      include: {
        lignes: true,
        partenaire: {
          select: { id_partenaire: true, code_partenaire: true, nom_partenaire: true },
        },
      },
    })

    if (!document) {
      throw new NotFoundError('Document')
    }

    return apiSuccess(document)
  } catch (error) {
    return apiError(error)
  }
}

export async function createDocumentHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const apiUser = await requireApiKey(request)

    const body = await request.json()
    const parsed = documentCreateSchema.safeParse(body)
    if (!parsed.success) {
      throw createValidationErrorFromZod(parsed.error)
    }

    const existing = await prisma.docVente.findUnique({
      where: { numero_document: parsed.data.numero_document },
    })
    if (existing) {
      throw new ConflictError(`Document with number ${parsed.data.numero_document} already exists`)
    }

    const partner = await prisma.partenaire.findUnique({
      where: { id_partenaire: parsed.data.id_partenaire },
    })
    if (!partner) {
      throw new NotFoundError('Partner')
    }

    const data: Prisma.DocVenteCreateInput = {
      ...parsed.data,
      id_partenaire: parsed.data.id_partenaire,
      cree_par: apiUser.userId,
    }
    if (parsed.data.date_document) {
      data.date_document = new Date(parsed.data.date_document)
    }
    if (parsed.data.date_echeance) {
      data.date_echeance = new Date(parsed.data.date_echeance)
    }
    if (parsed.data.date_livraison) {
      data.date_livraison = new Date(parsed.data.date_livraison)
    }
    if (parsed.data.date_livraison_prevue) {
      data.date_livraison_prevue = new Date(parsed.data.date_livraison_prevue)
    }

    const document = await prisma.docVente.create({ data })

    CacheInvalidationService.invalidateDocument(document.id_document)

    return apiCreated(document)
  } catch (error) {
    return apiError(error)
  }
}

export async function updateDocumentHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const apiUser = await requireApiKey(request)

    const id = extractIdFromUrl(request)

    const body = await request.json()
    const parsed = documentUpdateSchema.safeParse(body)
    if (!parsed.success) {
      throw createValidationErrorFromZod(parsed.error)
    }

    const existing = await prisma.docVente.findUnique({
      where: { id_document: id },
    })
    if (!existing) {
      throw new NotFoundError('Document')
    }

    if (parsed.data.numero_document && parsed.data.numero_document !== existing.numero_document) {
      const duplicate = await prisma.docVente.findUnique({
        where: { numero_document: parsed.data.numero_document },
      })
      if (duplicate) {
        throw new ConflictError(`Document with number ${parsed.data.numero_document} already exists`)
      }
    }

    const data: Record<string, unknown> = { ...parsed.data, modifie_par: apiUser.userId }
    if (parsed.data.date_document) {
      data.date_document = new Date(parsed.data.date_document)
    }
    if (parsed.data.date_echeance) {
      data.date_echeance = new Date(parsed.data.date_echeance)
    }
    if (parsed.data.date_livraison) {
      data.date_livraison = new Date(parsed.data.date_livraison)
    }
    if (parsed.data.date_livraison_prevue) {
      data.date_livraison_prevue = new Date(parsed.data.date_livraison_prevue)
    }

    const document = await prisma.docVente.update({
      where: { id_document: id },
      data,
    })

    CacheInvalidationService.invalidateDocument(document.id_document)

    return apiSuccess(document)
  } catch (error) {
    return apiError(error)
  }
}

export async function deleteDocumentHandler(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const id = extractIdFromUrl(request)

    const existing = await prisma.docVente.findUnique({
      where: { id_document: id },
    })
    if (!existing) {
      throw new NotFoundError('Document')
    }

    await prisma.docVente.update({
      where: { id_document: id },
      data: { statut_document: 'ANNULE', modifie_par: await getAuthenticatedUserId(request) },
    })

    CacheInvalidationService.invalidateDocument(id)

    return apiNoContent()
  } catch (error) {
    return apiError(error)
  }
}

export async function getDocumentLinesHandler(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const segments = request.nextUrl.pathname.split('/')
    const idSegment = segments[segments.length - 2] ?? ''
    const documentId = parseInt(idSegment, 10)
    if (isNaN(documentId)) {
      throw new ValidationError('Invalid document ID')
    }

    const document = await prisma.docVente.findUnique({
      where: { id_document: documentId },
    })
    if (!document) {
      throw new NotFoundError('Document')
    }

    const { page, limit } = parsePagination(request)
    const skip = (page - 1) * limit

    const [lines, total] = await Promise.all([
      prisma.ligneDocument.findMany({
        where: { id_document: documentId },
        skip,
        take: limit,
        orderBy: { numero_ligne: 'asc' },
      }),
      prisma.ligneDocument.count({ where: { id_document: documentId } }),
    ])

    const totalPages = Math.ceil(total / limit)

    return apiPaginated(lines, {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    })
  } catch (error) {
    return apiError(error)
  }
}
