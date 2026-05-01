import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getApiUser, requireApiKey } from '@/lib/api/auth'
import { apiSuccess, apiPaginated, apiCreated, apiNoContent, apiError } from '@/lib/api/response'
import {
  productCreateSchema,
  productUpdateSchema,
  paginationSchema,
} from '@/lib/api/validators/produits'
import { ValidationError, NotFoundError, ConflictError } from '@/lib/errors'
import { createValidationErrorFromZod } from '@/lib/errors'
import { Prisma } from '@/lib/generated/prisma/client'

const ALLOWED_SORT_FIELDS = [
  'id_produit',
  'code_produit',
  'nom_produit',
  'famille',
  'prix_vente',
  'prix_achat',
  'date_creation',
  'date_modification',
] as const

type AllowedSortField = (typeof ALLOWED_SORT_FIELDS)[number]

function extractIdFromUrl(request: NextRequest): number {
  const segments = request.nextUrl.pathname.split('/')
  const lastSegment = segments[segments.length - 1]
  const id = parseInt(lastSegment, 10)
  if (isNaN(id)) {
    throw new ValidationError('Invalid product ID')
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

export async function listProductsHandler(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const { page, limit } = parsePagination(request)
    const url = request.nextUrl
    const search = url.searchParams.get('search') || undefined
    const category = url.searchParams.get('categorie') || undefined
    const famille = url.searchParams.get('famille') || undefined
    const actif = url.searchParams.get('actif') || undefined
    const sortParam = url.searchParams.get('sort') || 'nom_produit'
    const orderParam = (url.searchParams.get('order') || 'asc').toLowerCase()

    const sort = ALLOWED_SORT_FIELDS.includes(sortParam as AllowedSortField)
      ? (sortParam as AllowedSortField)
      : 'nom_produit'
    const order = orderParam === 'desc' ? ('desc' as const) : ('asc' as const)

    const skip = (page - 1) * limit

    const where: Prisma.ProduitWhereInput = {}
    if (category) {
      where.id_categorie = parseInt(category, 10) || undefined
    }
    if (famille) {
      where.famille = famille
    }
    if (actif === 'true') {
      where.est_actif = true
    } else if (actif === 'false') {
      where.est_actif = false
    }
    if (search) {
      where.OR = [
        { nom_produit: { contains: search, mode: 'insensitive' } },
        { code_produit: { contains: search, mode: 'insensitive' } },
        { code_barre_ean: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [products, total] = await Promise.all([
      prisma.produit.findMany({
        skip,
        take: limit,
        where,
        orderBy: { [sort]: order },
      }),
      prisma.produit.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

    return apiPaginated(products, {
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

export async function getProductByIdHandler(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const id = extractIdFromUrl(request)

    const product = await prisma.produit.findUnique({
      where: { id_produit: id },
    })

    if (!product) {
      throw new NotFoundError('Product')
    }

    return apiSuccess(product)
  } catch (error) {
    return apiError(error)
  }
}

export async function createProductHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const apiUser = await requireApiKey(request)

    const body = await request.json()
    const parsed = productCreateSchema.safeParse(body)
    if (!parsed.success) {
      throw createValidationErrorFromZod(parsed.error)
    }

    const existing = await prisma.produit.findUnique({
      where: { code_produit: parsed.data.code_produit },
    })
    if (existing) {
      throw new ConflictError(`Product with code ${parsed.data.code_produit} already exists`)
    }

    const product = await prisma.produit.create({
      data: {
        ...parsed.data,
        cree_par: apiUser.userId,
      },
    })

    return apiCreated(product)
  } catch (error) {
    return apiError(error)
  }
}

export async function updateProductHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const apiUser = await requireApiKey(request)

    const id = extractIdFromUrl(request)

    const body = await request.json()
    const parsed = productUpdateSchema.safeParse(body)
    if (!parsed.success) {
      throw createValidationErrorFromZod(parsed.error)
    }

    const existing = await prisma.produit.findUnique({
      where: { id_produit: id },
    })
    if (!existing) {
      throw new NotFoundError('Product')
    }

    if (parsed.data.code_produit && parsed.data.code_produit !== existing.code_produit) {
      const duplicate = await prisma.produit.findUnique({
        where: { code_produit: parsed.data.code_produit },
      })
      if (duplicate) {
        throw new ConflictError(`Product with code ${parsed.data.code_produit} already exists`)
      }
    }

    const product = await prisma.produit.update({
      where: { id_produit: id },
      data: {
        ...parsed.data,
        modifie_par: apiUser.userId,
      },
    })

    return apiSuccess(product)
  } catch (error) {
    return apiError(error)
  }
}

export async function deleteProductHandler(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const id = extractIdFromUrl(request)

    const existing = await prisma.produit.findUnique({
      where: { id_produit: id },
    })
    if (!existing) {
      throw new NotFoundError('Product')
    }

    await prisma.produit.update({
      where: { id_produit: id },
      data: { est_actif: false, modifie_par: await getAuthenticatedUserId(request) },
    })

    return apiNoContent()
  } catch (error) {
    return apiError(error)
  }
}

export async function getProductStockLevelsHandler(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const segments = request.nextUrl.pathname.split('/')
    const idSegment = segments[segments.length - 2] ?? ''
    const productId = parseInt(idSegment, 10)
    if (isNaN(productId)) {
      throw new ValidationError('Invalid product ID')
    }

    const product = await prisma.produit.findUnique({
      where: { id_produit: productId },
    })
    if (!product) {
      throw new NotFoundError('Product')
    }

    const { page, limit } = parsePagination(request)
    const skip = (page - 1) * limit

    const [stockLevels, total] = await Promise.all([
      prisma.niveauStock.findMany({
        where: { id_produit: productId },
        skip,
        take: limit,
        orderBy: { date_creation: 'desc' },
        include: {
          entrepot: {
            select: { id_entrepot: true, code_entrepot: true, nom_entrepot: true },
          },
        },
      }),
      prisma.niveauStock.count({ where: { id_produit: productId } }),
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
