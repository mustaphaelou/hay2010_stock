import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireApiKey } from '@/lib/api/auth'
import { apiSuccess, apiPaginated, apiCreated, apiNoContent, apiError } from '@/lib/api/response'
import {
  stockLevelCreateSchema,
  stockLevelUpdateSchema,
  paginationSchema,
} from '@/lib/api/validators/niveaux-stock'
import { ValidationError, NotFoundError, ConflictError } from '@/lib/errors'
import { createValidationErrorFromZod } from '@/lib/errors'
import { Prisma } from '@/lib/generated/prisma/client'

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
    await requireApiKey(request)

    const body = await request.json()
    const parsed = stockLevelCreateSchema.safeParse(body)
    if (!parsed.success) {
      throw createValidationErrorFromZod(parsed.error)
    }

    const existing = await prisma.niveauStock.findUnique({
      where: {
        id_produit_id_entrepot: {
          id_produit: parsed.data.id_produit,
          id_entrepot: parsed.data.id_entrepot,
        },
      },
    })
    if (existing) {
      throw new ConflictError('Stock level already exists for this product-warehouse combination')
    }

    const product = await prisma.produit.findUnique({
      where: { id_produit: parsed.data.id_produit },
    })
    if (!product) {
      throw new NotFoundError('Product')
    }

    const warehouse = await prisma.entrepot.findUnique({
      where: { id_entrepot: parsed.data.id_entrepot },
    })
    if (!warehouse) {
      throw new NotFoundError('Warehouse')
    }

    const stockLevel = await prisma.niveauStock.create({
      data: parsed.data,
    })

    return apiCreated(stockLevel)
  } catch (error) {
    return apiError(error)
  }
}

export async function updateStockLevelHandler(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const id = extractIdFromUrl(request)

    const body = await request.json()
    const parsed = stockLevelUpdateSchema.safeParse(body)
    if (!parsed.success) {
      throw createValidationErrorFromZod(parsed.error)
    }

    const existing = await prisma.niveauStock.findUnique({
      where: { id_stock: id },
    })
    if (!existing) {
      throw new NotFoundError('Stock level')
    }

    if (
      parsed.data.id_produit !== undefined &&
      parsed.data.id_entrepot !== undefined &&
      (parsed.data.id_produit !== existing.id_produit ||
        parsed.data.id_entrepot !== existing.id_entrepot)
    ) {
      const duplicate = await prisma.niveauStock.findUnique({
        where: {
          id_produit_id_entrepot: {
            id_produit: parsed.data.id_produit,
            id_entrepot: parsed.data.id_entrepot,
          },
        },
      })
      if (duplicate) {
        throw new ConflictError('Stock level already exists for this product-warehouse combination')
      }
    }

    const stockLevel = await prisma.niveauStock.update({
      where: { id_stock: id },
      data: parsed.data,
    })

    return apiSuccess(stockLevel)
  } catch (error) {
    return apiError(error)
  }
}

export async function deleteStockLevelHandler(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const id = extractIdFromUrl(request)

    const existing = await prisma.niveauStock.findUnique({
      where: { id_stock: id },
    })
    if (!existing) {
      throw new NotFoundError('Stock level')
    }

    await prisma.niveauStock.delete({
      where: { id_stock: id },
    })

    return apiNoContent()
  } catch (error) {
    return apiError(error)
  }
}
