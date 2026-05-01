import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getApiUser, requireApiKey } from '@/lib/api/auth'
import { apiSuccess, apiPaginated, apiCreated, apiNoContent, apiError } from '@/lib/api/response'
import {
  affaireCreateSchema,
  affaireUpdateSchema,
  paginationSchema,
} from '@/lib/api/validators/affaires'
import { ValidationError, NotFoundError, ConflictError } from '@/lib/errors'
import { createValidationErrorFromZod } from '@/lib/errors'
import { Prisma } from '@/lib/generated/prisma/client'

const ALLOWED_SORT_FIELDS = [
  'id_affaire',
  'code_affaire',
  'intitule_affaire',
  'type_affaire',
  'statut_affaire',
  'budget_prevu',
  'chiffre_affaires',
  'date_creation',
  'date_modification',
] as const

type AllowedSortField = (typeof ALLOWED_SORT_FIELDS)[number]

function extractIdFromUrl(request: NextRequest): number {
  const segments = request.nextUrl.pathname.split('/')
  const lastSegment = segments[segments.length - 1]
  const id = parseInt(lastSegment, 10)
  if (isNaN(id)) {
    throw new ValidationError('Invalid affair ID')
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

export async function listAffairesHandler(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const { page, limit } = parsePagination(request)
    const url = request.nextUrl
    const search = url.searchParams.get('search') || undefined
    const type = url.searchParams.get('type') || undefined
    const statut = url.searchParams.get('statut') || undefined
    const client = url.searchParams.get('client') || undefined
    const sortParam = url.searchParams.get('sort') || 'date_creation'
    const orderParam = (url.searchParams.get('order') || 'desc').toLowerCase()

    const sort = ALLOWED_SORT_FIELDS.includes(sortParam as AllowedSortField)
      ? (sortParam as AllowedSortField)
      : 'date_creation'
    const order = orderParam === 'desc' ? ('desc' as const) : ('asc' as const)

    const skip = (page - 1) * limit

    const where: Prisma.AffaireWhereInput = {}
    if (type) {
      where.type_affaire = type
    }
    if (statut) {
      where.statut_affaire = statut
    }
    if (client) {
      where.id_client = parseInt(client, 10) || undefined
    }
    if (search) {
      where.OR = [
        { intitule_affaire: { contains: search, mode: 'insensitive' } },
        { code_affaire: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [affaires, total] = await Promise.all([
      prisma.affaire.findMany({
        skip,
        take: limit,
        where,
        orderBy: { [sort]: order },
      }),
      prisma.affaire.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

    return apiPaginated(affaires, {
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

export async function getAffaireByIdHandler(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const id = extractIdFromUrl(request)

    const affaire = await prisma.affaire.findUnique({
      where: { id_affaire: id },
      include: {
        client: {
          select: { id_partenaire: true, code_partenaire: true, nom_partenaire: true },
        },
      },
    })

    if (!affaire) {
      throw new NotFoundError('Affair')
    }

    return apiSuccess(affaire)
  } catch (error) {
    return apiError(error)
  }
}

export async function createAffaireHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const apiUser = await requireApiKey(request)

    const body = await request.json()
    const parsed = affaireCreateSchema.safeParse(body)
    if (!parsed.success) {
      throw createValidationErrorFromZod(parsed.error)
    }

    const existing = await prisma.affaire.findUnique({
      where: { code_affaire: parsed.data.code_affaire },
    })
    if (existing) {
      throw new ConflictError(`Affair with code ${parsed.data.code_affaire} already exists`)
    }

    const data: Record<string, unknown> = { ...parsed.data, cree_par: apiUser.userId }
    if (parsed.data.date_debut) {
      data.date_debut = new Date(parsed.data.date_debut)
    }
    if (parsed.data.date_fin_prevue) {
      data.date_fin_prevue = new Date(parsed.data.date_fin_prevue)
    }
    if (parsed.data.date_fin_reelle) {
      data.date_fin_reelle = new Date(parsed.data.date_fin_reelle)
    }

    const affaire = await prisma.affaire.create({
      data: data as Prisma.AffaireCreateInput,
    })

    return apiCreated(affaire)
  } catch (error) {
    return apiError(error)
  }
}

export async function updateAffaireHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const apiUser = await requireApiKey(request)

    const id = extractIdFromUrl(request)

    const body = await request.json()
    const parsed = affaireUpdateSchema.safeParse(body)
    if (!parsed.success) {
      throw createValidationErrorFromZod(parsed.error)
    }

    const existing = await prisma.affaire.findUnique({
      where: { id_affaire: id },
    })
    if (!existing) {
      throw new NotFoundError('Affair')
    }

    if (parsed.data.code_affaire && parsed.data.code_affaire !== existing.code_affaire) {
      const duplicate = await prisma.affaire.findUnique({
        where: { code_affaire: parsed.data.code_affaire },
      })
      if (duplicate) {
        throw new ConflictError(`Affair with code ${parsed.data.code_affaire} already exists`)
      }
    }

    const data: Record<string, unknown> = { ...parsed.data, modifie_par: apiUser.userId }
    if (parsed.data.date_debut) {
      data.date_debut = new Date(parsed.data.date_debut)
    }
    if (parsed.data.date_fin_prevue) {
      data.date_fin_prevue = new Date(parsed.data.date_fin_prevue)
    }
    if (parsed.data.date_fin_reelle) {
      data.date_fin_reelle = new Date(parsed.data.date_fin_reelle)
    }

    const affaire = await prisma.affaire.update({
      where: { id_affaire: id },
      data,
    })

    return apiSuccess(affaire)
  } catch (error) {
    return apiError(error)
  }
}

export async function deleteAffaireHandler(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const id = extractIdFromUrl(request)

    const existing = await prisma.affaire.findUnique({
      where: { id_affaire: id },
    })
    if (!existing) {
      throw new NotFoundError('Affair')
    }

    await prisma.affaire.update({
      where: { id_affaire: id },
      data: { est_actif: false, modifie_par: await getAuthenticatedUserId(request) },
    })

    return apiNoContent()
  } catch (error) {
    return apiError(error)
  }
}

export async function getAffaireDocumentsHandler(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const segments = request.nextUrl.pathname.split('/')
    const idSegment = segments[segments.length - 2] ?? ''
    const affaireId = parseInt(idSegment, 10)
    if (isNaN(affaireId)) {
      throw new ValidationError('Invalid affair ID')
    }

    const affaire = await prisma.affaire.findUnique({
      where: { id_affaire: affaireId },
    })
    if (!affaire) {
      throw new NotFoundError('Affair')
    }

    const { page, limit } = parsePagination(request)
    const skip = (page - 1) * limit

    const [documents, total] = await Promise.all([
      prisma.docVente.findMany({
        where: { id_affaire: affaireId },
        skip,
        take: limit,
        orderBy: { date_creation: 'desc' },
        include: {
          lignes: { select: { id_ligne: true } },
        },
      }),
      prisma.docVente.count({ where: { id_affaire: affaireId } }),
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
