import { NextRequest, NextResponse } from 'next/server'
import { requireApiKey } from '@/lib/api/auth'
import { apiSuccess, apiPaginated, apiCreated, apiNoContent, apiError } from '@/lib/api/response'
import { handleServiceError } from '@/lib/api/service-error'
import { ValidationError, NotFoundError } from '@/lib/errors'
import { createValidationErrorFromZod } from '@/lib/errors'
import { prisma } from '@/lib/db/prisma'
import { paginationSchema } from '@/lib/pagination'
import { Prisma } from '@/lib/generated/prisma/client'
import {
  createStockLevel,
  adjustStockLevel,
  deleteStockLevel,
} from '@/lib/stock/stock-service'
import { executeWrite } from '@/lib/actions/execute-write'

const ALLOWED_SORT_FIELDS = [
  'id_stock',
  'id_produit',
  'id_entrepot',
  'quantite_en_stock',
  'quantite_reservee',
  'quantite_commandee',
  'date_dernier_mouvement',
  'date_creation',
  'date_modification',
] as const

type AllowedSortField = (typeof ALLOWED_SORT_FIELDS)[number]

function extractIdFromUrl(request: NextRequest): number {
  const segments = request.nextUrl.pathname.split('/')
  const lastSegment = segments[segments.length - 1]
  const id = parseInt(lastSegment, 10)
  if (isNaN(id)) {
    throw new ValidationError('Invalid stock level ID')
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

export async function listStockLevelsHandler(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const { page, limit } = parsePagination(request)
    const url = request.nextUrl
    const produit = url.searchParams.get('produit') || undefined
    const entrepot = url.searchParams.get('entrepot') || undefined
    const sortParam = url.searchParams.get('sort') || 'date_creation'
    const orderParam = (url.searchParams.get('order') || 'desc').toLowerCase()

    const sort = ALLOWED_SORT_FIELDS.includes(sortParam as AllowedSortField)
      ? (sortParam as AllowedSortField)
      : 'date_creation'
    const order = orderParam === 'desc' ? ('desc' as const) : ('asc' as const)

    const skip = (page - 1) * limit

    const where: Prisma.NiveauStockWhereInput = {}
    if (produit) {
      where.id_produit = parseInt(produit, 10) || undefined
    }
    if (entrepot) {
      where.id_entrepot = parseInt(entrepot, 10) || undefined
    }

    const [stockLevels, total] = await Promise.all([
      prisma.niveauStock.findMany({
        skip,
        take: limit,
        where,
        orderBy: { [sort]: order },
        include: {
          produit: {
            select: { id_produit: true, code_produit: true, nom_produit: true },
          },
          entrepot: {
            select: { id_entrepot: true, code_entrepot: true, nom_entrepot: true },
          },
        },
      }),
      prisma.niveauStock.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

    return apiPaginated(stockLevels, {
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

export async function getStockLevelByIdHandler(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const id = extractIdFromUrl(request)

    const stockLevel = await prisma.niveauStock.findUnique({
      where: { id_stock: id },
      include: {
        produit: {
          select: { id_produit: true, code_produit: true, nom_produit: true },
        },
        entrepot: {
          select: { id_entrepot: true, code_entrepot: true, nom_entrepot: true },
        },
      },
    })

    if (!stockLevel) {
      throw new NotFoundError('Stock level')
    }

    return apiSuccess(stockLevel)
  } catch (error) {
    return apiError(error)
  }
}

export async function createStockLevelHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const apiUser = await requireApiKey(request)

    const body = await request.json()
    const result = await executeWrite({
      user: { id: apiUser.userId, email: '', name: '', role: apiUser.role },
      writeFn: () => createStockLevel(body, apiUser.userId),
      invalidations: [{ kind: 'stock' }],
    })

    handleServiceError(result)

    if (!result.data) {
      return apiCreated({})
    }

    return apiCreated(result.data)
  } catch (error) {
    return apiError(error)
  }
}

export async function adjustStockLevelHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const apiUser = await requireApiKey(request)

    const body = await request.json()

    const result = await executeWrite({
      user: { id: apiUser.userId, email: '', name: '', role: apiUser.role },
      writeFn: () => adjustStockLevel(body, apiUser.userId),
      invalidations: [{ kind: 'stock' }],
    })

    handleServiceError(result)

    return apiSuccess(result.data)
  } catch (error) {
    return apiError(error)
  }
}

export async function deleteStockLevelHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const apiUser = await requireApiKey(request)

    const id = extractIdFromUrl(request)
    const result = await executeWrite({
      user: { id: apiUser.userId, email: '', name: '', role: apiUser.role },
      writeFn: () => deleteStockLevel(id),
      invalidations: [{ kind: 'stock' }],
    })

    handleServiceError(result)

    return apiNoContent()
  } catch (error) {
    return apiError(error)
  }
}