import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getApiUser, requireApiKey } from '@/lib/api/auth'
import { apiSuccess, apiPaginated, apiCreated, apiNoContent, apiError } from '@/lib/api/response'
import {
  partnerCreateSchema,
  partnerUpdateSchema,
  paginationSchema,
} from '@/lib/api/validators/partenaires'
import { ValidationError, NotFoundError, ConflictError } from '@/lib/errors'
import { createValidationErrorFromZod } from '@/lib/errors'
import { Prisma } from '@/lib/generated/prisma/client'


const ALLOWED_SORT_FIELDS = [
  'id_partenaire',
  'code_partenaire',
  'nom_partenaire',
  'type_partenaire',
  'ville',
  'pays',
  'date_creation',
  'date_modification',
] as const

type AllowedSortField = (typeof ALLOWED_SORT_FIELDS)[number]

function extractIdFromUrl(request: NextRequest): number {
  const segments = request.nextUrl.pathname.split('/')
  const lastSegment = segments[segments.length - 1]
  const id = parseInt(lastSegment, 10)
  if (isNaN(id)) {
    throw new ValidationError('Invalid partner ID')
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

export async function listPartnersHandler(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const { page, limit } = parsePagination(request)
    const url = request.nextUrl
    const type = url.searchParams.get('type') || undefined
    const search = url.searchParams.get('search') || undefined
    const sortParam = url.searchParams.get('sort') || 'nom_partenaire'
    const orderParam = (url.searchParams.get('order') || 'asc').toLowerCase()

    const sort = ALLOWED_SORT_FIELDS.includes(sortParam as AllowedSortField)
      ? (sortParam as AllowedSortField)
      : 'nom_partenaire'
    const order = orderParam === 'desc' ? ('desc' as const) : ('asc' as const)

    const validTypes = ['CLIENT', 'FOURNISSEUR', 'LES_DEUX']
    let typeFilter = undefined
    if (type && type !== 'all') {
      if (!validTypes.includes(type)) {
        throw new ValidationError('Invalid type filter. Must be CLIENT, FOURNISSEUR, or LES_DEUX')
      }
      typeFilter = type
    }

    const skip = (page - 1) * limit

    const where: Prisma.PartenaireWhereInput = {}
    if (typeFilter) {
      where.type_partenaire = typeFilter as Prisma.EnumTypePartenaireFilter['equals']
    }
    if (search) {
      where.OR = [
        { nom_partenaire: { contains: search, mode: 'insensitive' } },
        { code_partenaire: { contains: search, mode: 'insensitive' } },
        { ville: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [partners, total] = await Promise.all([
      prisma.partenaire.findMany({
        skip,
        take: limit,
        where,
        orderBy: { [sort]: order },
      }),
      prisma.partenaire.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

    return apiPaginated(partners, {
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

export async function getPartnerByIdHandler(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const id = extractIdFromUrl(request)

    const partner = await prisma.partenaire.findUnique({
      where: { id_partenaire: id },
    })

    if (!partner) {
      throw new NotFoundError('Partner')
    }

    return apiSuccess(partner)
  } catch (error) {
    return apiError(error)
  }
}

export async function createPartnerHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const apiUser = await requireApiKey(request)

    const body = await request.json()
    const parsed = partnerCreateSchema.safeParse(body)
    if (!parsed.success) {
      throw createValidationErrorFromZod(parsed.error)
    }

    const existing = await prisma.partenaire.findUnique({
      where: { code_partenaire: parsed.data.code_partenaire },
    })
    if (existing) {
      throw new ConflictError(`Partner with code ${parsed.data.code_partenaire} already exists`)
    }

    const partner = await prisma.partenaire.create({
      data: {
        ...parsed.data,
        cree_par: apiUser.userId,
      },
    })

    return apiCreated(partner)
  } catch (error) {
    return apiError(error)
  }
}

export async function updatePartnerHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const apiUser = await requireApiKey(request)

    const id = extractIdFromUrl(request)

    const body = await request.json()
    const parsed = partnerUpdateSchema.safeParse(body)
    if (!parsed.success) {
      throw createValidationErrorFromZod(parsed.error)
    }

    const existing = await prisma.partenaire.findUnique({
      where: { id_partenaire: id },
    })
    if (!existing) {
      throw new NotFoundError('Partner')
    }

    if (parsed.data.code_partenaire && parsed.data.code_partenaire !== existing.code_partenaire) {
      const duplicate = await prisma.partenaire.findUnique({
        where: { code_partenaire: parsed.data.code_partenaire },
      })
      if (duplicate) {
        throw new ConflictError(`Partner with code ${parsed.data.code_partenaire} already exists`)
      }
    }

    const partner = await prisma.partenaire.update({
      where: { id_partenaire: id },
      data: {
        ...parsed.data,
        modifie_par: apiUser.userId,
      },
    })

    return apiSuccess(partner)
  } catch (error) {
    return apiError(error)
  }
}

export async function deletePartnerHandler(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const id = extractIdFromUrl(request)

    const existing = await prisma.partenaire.findUnique({
      where: { id_partenaire: id },
    })
    if (!existing) {
      throw new NotFoundError('Partner')
    }

    await prisma.partenaire.update({
      where: { id_partenaire: id },
      data: { est_actif: false, modifie_par: await getAuthenticatedUserId(request) },
    })

    return apiNoContent()
  } catch (error) {
    return apiError(error)
  }
}

export async function getPartnerDocumentsHandler(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const segments = request.nextUrl.pathname.split('/')
    const idSegment = segments[segments.length - 2] ?? ''
    const partnerId = parseInt(idSegment, 10)
    if (isNaN(partnerId)) {
      throw new ValidationError('Invalid partner ID')
    }

    const partner = await prisma.partenaire.findUnique({
      where: { id_partenaire: partnerId },
    })
    if (!partner) {
      throw new NotFoundError('Partner')
    }

    const { page, limit } = parsePagination(request)
    const skip = (page - 1) * limit

    const [documents, total] = await Promise.all([
      prisma.docVente.findMany({
        where: { id_partenaire: partnerId },
        skip,
        take: limit,
        orderBy: { date_creation: 'desc' },
        include: {
          lignes: { select: { id_ligne: true } },
        },
      }),
      prisma.docVente.count({ where: { id_partenaire: partnerId } }),
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
