import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireApiKey } from '@/lib/api/auth'
import { apiSuccess, apiPaginated, apiCreated, apiNoContent, apiError } from '@/lib/api/response'
import {
  warehouseCreateSchema,
  warehouseUpdateSchema,
  paginationSchema,
} from '@/lib/api/validators/entrepots'
import { ValidationError, NotFoundError, ConflictError } from '@/lib/errors'
import { createValidationErrorFromZod } from '@/lib/errors'
import { Prisma } from '@/lib/generated/prisma/client'

const ALLOWED_SORT_FIELDS = [
  'id_entrepot',
  'code_entrepot',
  'nom_entrepot',
  'ville_entrepot',
  'capacite_totale_unites',
  'date_creation',
  'date_modification',
] as const

type AllowedSortField = (typeof ALLOWED_SORT_FIELDS)[number]

function extractIdFromUrl(request: NextRequest): number {
  const segments = request.nextUrl.pathname.split('/')
  const lastSegment = segments[segments.length - 1]
  const id = parseInt(lastSegment, 10)
  if (isNaN(id)) {
    throw new ValidationError('Invalid warehouse ID')
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

export async function listWarehousesHandler(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const { page, limit } = parsePagination(request)
    const url = request.nextUrl
    const search = url.searchParams.get('search') || undefined
    const principal = url.searchParams.get('principal') || undefined
    const sortParam = url.searchParams.get('sort') || 'nom_entrepot'
    const orderParam = (url.searchParams.get('order') || 'asc').toLowerCase()

    const sort = ALLOWED_SORT_FIELDS.includes(sortParam as AllowedSortField)
      ? (sortParam as AllowedSortField)
      : 'nom_entrepot'
    const order = orderParam === 'desc' ? ('desc' as const) : ('asc' as const)

    const skip = (page - 1) * limit

    const where: Prisma.EntrepotWhereInput = {}
    if (principal === 'true') {
      where.est_entrepot_principal = true
    } else if (principal === 'false') {
      where.est_entrepot_principal = false
    }
    if (search) {
      where.OR = [
        { nom_entrepot: { contains: search, mode: 'insensitive' } },
        { code_entrepot: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [warehouses, total] = await Promise.all([
      prisma.entrepot.findMany({
        skip,
        take: limit,
        where,
        orderBy: { [sort]: order },
      }),
      prisma.entrepot.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

    return apiPaginated(warehouses, {
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

export async function getWarehouseByIdHandler(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const id = extractIdFromUrl(request)

    const warehouse = await prisma.entrepot.findUnique({
      where: { id_entrepot: id },
    })

    if (!warehouse) {
      throw new NotFoundError('Warehouse')
    }

    return apiSuccess(warehouse)
  } catch (error) {
    return apiError(error)
  }
}

export async function createWarehouseHandler(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const body = await request.json()
    const parsed = warehouseCreateSchema.safeParse(body)
    if (!parsed.success) {
      throw createValidationErrorFromZod(parsed.error)
    }

    const existing = await prisma.entrepot.findUnique({
      where: { code_entrepot: parsed.data.code_entrepot },
    })
    if (existing) {
      throw new ConflictError(`Warehouse with code ${parsed.data.code_entrepot} already exists`)
    }

    const warehouse = await prisma.entrepot.create({
      data: parsed.data,
    })

    return apiCreated(warehouse)
  } catch (error) {
    return apiError(error)
  }
}

export async function updateWarehouseHandler(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const id = extractIdFromUrl(request)

    const body = await request.json()
    const parsed = warehouseUpdateSchema.safeParse(body)
    if (!parsed.success) {
      throw createValidationErrorFromZod(parsed.error)
    }

    const existing = await prisma.entrepot.findUnique({
      where: { id_entrepot: id },
    })
    if (!existing) {
      throw new NotFoundError('Warehouse')
    }

    if (parsed.data.code_entrepot && parsed.data.code_entrepot !== existing.code_entrepot) {
      const duplicate = await prisma.entrepot.findUnique({
        where: { code_entrepot: parsed.data.code_entrepot },
      })
      if (duplicate) {
        throw new ConflictError(`Warehouse with code ${parsed.data.code_entrepot} already exists`)
      }
    }

    const warehouse = await prisma.entrepot.update({
      where: { id_entrepot: id },
      data: parsed.data,
    })

    return apiSuccess(warehouse)
  } catch (error) {
    return apiError(error)
  }
}

export async function deleteWarehouseHandler(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const id = extractIdFromUrl(request)

    const existing = await prisma.entrepot.findUnique({
      where: { id_entrepot: id },
    })
    if (!existing) {
      throw new NotFoundError('Warehouse')
    }

    await prisma.entrepot.update({
      where: { id_entrepot: id },
      data: { est_actif: false },
    })

    return apiNoContent()
  } catch (error) {
    return apiError(error)
  }
}

export async function getWarehouseStockLevelsHandler(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const segments = request.nextUrl.pathname.split('/')
    const idSegment = segments[segments.length - 2] ?? ''
    const warehouseId = parseInt(idSegment, 10)
    if (isNaN(warehouseId)) {
      throw new ValidationError('Invalid warehouse ID')
    }

    const warehouse = await prisma.entrepot.findUnique({
      where: { id_entrepot: warehouseId },
    })
    if (!warehouse) {
      throw new NotFoundError('Warehouse')
    }

    const { page, limit } = parsePagination(request)
    const skip = (page - 1) * limit

    const [stockLevels, total] = await Promise.all([
      prisma.niveauStock.findMany({
        where: { id_entrepot: warehouseId },
        skip,
        take: limit,
        orderBy: { date_creation: 'desc' },
        include: {
          produit: {
            select: { id_produit: true, code_produit: true, nom_produit: true },
          },
        },
      }),
      prisma.niveauStock.count({ where: { id_entrepot: warehouseId } }),
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
