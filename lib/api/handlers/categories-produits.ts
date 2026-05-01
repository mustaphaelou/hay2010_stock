import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireApiKey } from '@/lib/api/auth'
import { apiSuccess, apiPaginated, apiCreated, apiNoContent, apiError } from '@/lib/api/response'
import {
  categoryCreateSchema,
  categoryUpdateSchema,
  paginationSchema,
} from '@/lib/api/validators/categories-produits'
import { ValidationError, NotFoundError, ConflictError } from '@/lib/errors'
import { createValidationErrorFromZod } from '@/lib/errors'
import { Prisma } from '@/lib/generated/prisma/client'

const ALLOWED_SORT_FIELDS = [
  'id_categorie',
  'code_categorie',
  'nom_categorie',
  'date_creation',
  'date_modification',
] as const

type AllowedSortField = (typeof ALLOWED_SORT_FIELDS)[number]

function extractIdFromUrl(request: NextRequest): number {
  const segments = request.nextUrl.pathname.split('/')
  const lastSegment = segments[segments.length - 1]
  const id = parseInt(lastSegment, 10)
  if (isNaN(id)) {
    throw new ValidationError('Invalid category ID')
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

export async function listCategoriesHandler(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const { page, limit } = parsePagination(request)
    const url = request.nextUrl
    const search = url.searchParams.get('search') || undefined
    const parent = url.searchParams.get('parent') || undefined
    const sortParam = url.searchParams.get('sort') || 'nom_categorie'
    const orderParam = (url.searchParams.get('order') || 'asc').toLowerCase()

    const sort = ALLOWED_SORT_FIELDS.includes(sortParam as AllowedSortField)
      ? (sortParam as AllowedSortField)
      : 'nom_categorie'
    const order = orderParam === 'desc' ? ('desc' as const) : ('asc' as const)

    const skip = (page - 1) * limit

    const where: Prisma.CategorieProduitWhereInput = {}
    if (parent === 'null') {
      where.id_categorie_parent = null
    } else if (parent) {
      where.id_categorie_parent = parseInt(parent, 10) || undefined
    }
    if (search) {
      where.OR = [
        { nom_categorie: { contains: search, mode: 'insensitive' } },
        { code_categorie: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [categories, total] = await Promise.all([
      prisma.categorieProduit.findMany({
        skip,
        take: limit,
        where,
        orderBy: { [sort]: order },
      }),
      prisma.categorieProduit.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

    return apiPaginated(categories, {
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

export async function getCategoryByIdHandler(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const id = extractIdFromUrl(request)

    const category = await prisma.categorieProduit.findUnique({
      where: { id_categorie: id },
    })

    if (!category) {
      throw new NotFoundError('Category')
    }

    return apiSuccess(category)
  } catch (error) {
    return apiError(error)
  }
}

export async function createCategoryHandler(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const body = await request.json()
    const parsed = categoryCreateSchema.safeParse(body)
    if (!parsed.success) {
      throw createValidationErrorFromZod(parsed.error)
    }

    const existing = await prisma.categorieProduit.findUnique({
      where: { code_categorie: parsed.data.code_categorie },
    })
    if (existing) {
      throw new ConflictError(`Category with code ${parsed.data.code_categorie} already exists`)
    }

    const category = await prisma.categorieProduit.create({
      data: parsed.data,
    })

    return apiCreated(category)
  } catch (error) {
    return apiError(error)
  }
}

export async function updateCategoryHandler(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const id = extractIdFromUrl(request)

    const body = await request.json()
    const parsed = categoryUpdateSchema.safeParse(body)
    if (!parsed.success) {
      throw createValidationErrorFromZod(parsed.error)
    }

    const existing = await prisma.categorieProduit.findUnique({
      where: { id_categorie: id },
    })
    if (!existing) {
      throw new NotFoundError('Category')
    }

    if (parsed.data.code_categorie && parsed.data.code_categorie !== existing.code_categorie) {
      const duplicate = await prisma.categorieProduit.findUnique({
        where: { code_categorie: parsed.data.code_categorie },
      })
      if (duplicate) {
        throw new ConflictError(`Category with code ${parsed.data.code_categorie} already exists`)
      }
    }

    if (parsed.data.id_categorie_parent !== undefined && parsed.data.id_categorie_parent === id) {
      throw new ValidationError('A category cannot be its own parent')
    }

    const category = await prisma.categorieProduit.update({
      where: { id_categorie: id },
      data: parsed.data,
    })

    return apiSuccess(category)
  } catch (error) {
    return apiError(error)
  }
}

export async function deleteCategoryHandler(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const id = extractIdFromUrl(request)

    const existing = await prisma.categorieProduit.findUnique({
      where: { id_categorie: id },
    })
    if (!existing) {
      throw new NotFoundError('Category')
    }

    const childCount = await prisma.categorieProduit.count({
      where: { id_categorie_parent: id },
    })
    if (childCount > 0) {
      throw new ConflictError('Cannot delete a category that has child categories')
    }

    await prisma.categorieProduit.delete({
      where: { id_categorie: id },
    })

    return apiNoContent()
  } catch (error) {
    return apiError(error)
  }
}

export async function getCategoryChildrenHandler(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const segments = request.nextUrl.pathname.split('/')
    const idSegment = segments[segments.length - 2] ?? ''
    const categoryId = parseInt(idSegment, 10)
    if (isNaN(categoryId)) {
      throw new ValidationError('Invalid category ID')
    }

    const category = await prisma.categorieProduit.findUnique({
      where: { id_categorie: categoryId },
    })
    if (!category) {
      throw new NotFoundError('Category')
    }

    const { page, limit } = parsePagination(request)
    const skip = (page - 1) * limit

    const [children, total] = await Promise.all([
      prisma.categorieProduit.findMany({
        where: { id_categorie_parent: categoryId },
        skip,
        take: limit,
        orderBy: { nom_categorie: 'asc' },
      }),
      prisma.categorieProduit.count({ where: { id_categorie_parent: categoryId } }),
    ])

    const totalPages = Math.ceil(total / limit)

    return apiPaginated(children, {
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

export async function getCategoryProductsHandler(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const segments = request.nextUrl.pathname.split('/')
    const idSegment = segments[segments.length - 2] ?? ''
    const categoryId = parseInt(idSegment, 10)
    if (isNaN(categoryId)) {
      throw new ValidationError('Invalid category ID')
    }

    const category = await prisma.categorieProduit.findUnique({
      where: { id_categorie: categoryId },
    })
    if (!category) {
      throw new NotFoundError('Category')
    }

    const { page, limit } = parsePagination(request)
    const skip = (page - 1) * limit

    const [products, total] = await Promise.all([
      prisma.produit.findMany({
        where: { id_categorie: categoryId },
        skip,
        take: limit,
        orderBy: { nom_produit: 'asc' },
      }),
      prisma.produit.count({ where: { id_categorie: categoryId } }),
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
