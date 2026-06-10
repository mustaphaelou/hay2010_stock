import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import { Prisma } from '@/lib/generated/prisma/client'
import type { CategorieProduit } from '@/lib/generated/prisma/client'
import { createLogger } from '@/lib/logger'
import { createEmptyResult, buildPaginationMeta, getPaginationParams } from '@/lib/pagination'
import type { PaginatedResult } from '@/lib/pagination'
import { serviceError, validatedOrError } from '@/lib/service-result'
import type { ServiceResult, ServiceErrorCode } from '@/lib/service-result'
import { createCrudService } from '@/lib/crud-service'

const log = createLogger('categorie-produit-service')

export const categoryCreateSchema = z.object({
  code_categorie: z.string().min(1).max(50),
  nom_categorie: z.string().min(1).max(255),
  id_categorie_parent: z.number().int().positive().nullable().optional(),
  description_categorie: z.string().nullable().optional(),
  est_actif: z.boolean().default(true).optional(),
})

export const categoryUpdateSchema = categoryCreateSchema.partial()

type CreateInput = z.infer<typeof categoryCreateSchema>
type UpdateInput = z.infer<typeof categoryUpdateSchema>

const baseCrud = createCrudService<CategorieProduit, CreateInput, UpdateInput>({
  delegate: prisma.categorieProduit as any,
  entityName: 'Catégorie',
  createSchema: categoryCreateSchema,
  updateSchema: categoryUpdateSchema,
  uniqueFields: ['code_categorie'],
  idField: 'id_categorie',
  conflictFormatter: (field, value) => `La catégorie avec le code ${value} existe déjà`,
})

const ALLOWED_SORT_FIELDS = [
  'id_categorie',
  'code_categorie',
  'nom_categorie',
  'date_creation',
  'date_modification',
] as const

type AllowedSortField = (typeof ALLOWED_SORT_FIELDS)[number]

export async function listCategories(
  page: number = 1,
  limit: number = 50,
  search?: string,
  parent?: string,
  sort: string = 'nom_categorie',
  order: 'asc' | 'desc' = 'asc',
): Promise<PaginatedResult<unknown> & { error?: string; code?: ServiceErrorCode }> {
  try {
    const effectiveSort = ALLOWED_SORT_FIELDS.includes(sort as AllowedSortField)
      ? (sort as AllowedSortField)
      : 'nom_categorie'
    const { skip } = getPaginationParams({ page, limit })

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
        orderBy: { [effectiveSort]: order },
      }),
      prisma.categorieProduit.count({ where }),
    ])

    return {
      data: categories,
      meta: buildPaginationMeta(total, page, limit),
    }
  } catch (error) {
    log.error({ error, page, limit, search, parent }, 'Échec de la récupération des catégories')
    return { ...createEmptyResult(page, limit, 'Échec de la récupération des catégories'), ...serviceError('Échec de la récupération des catégories', 'INTERNAL') }
  }
}

export async function getCategoryById(id: number): Promise<ServiceResult<CategorieProduit>> {
  const result = await baseCrud.getById(id)
  if (!result.error && result.data === null) {
    return serviceError('Catégorie introuvable', 'NOT_FOUND')
  }
  return result as ServiceResult<CategorieProduit>
}

export const createCategory = baseCrud.create

export async function updateCategory(
  id: number,
  input: UpdateInput,
): Promise<ServiceResult<CategorieProduit>> {
  if (input.id_categorie_parent !== undefined && input.id_categorie_parent === id) {
    return serviceError('ID catégorie parent invalide: une catégorie ne peut pas être son propre parent', 'VALIDATION')
  }

  return baseCrud.update(id, input)
}

export async function deleteCategory(
  id: number,
): Promise<{ data?: { success: boolean }; error?: string; code?: ServiceErrorCode }> {
  try {
    const existing = await prisma.categorieProduit.findUnique({
      where: { id_categorie: id },
    })
    if (!existing) {
      return serviceError('Catégorie introuvable', 'NOT_FOUND')
    }

    const childCount = await prisma.categorieProduit.count({
      where: { id_categorie_parent: id },
    })
    if (childCount > 0) {
      return serviceError('Suppression invalide: la catégorie a des catégories enfants', 'CONFLICT')
    }

    await prisma.categorieProduit.delete({
      where: { id_categorie: id },
    })

    return { data: { success: true } }
  } catch (error) {
    log.error({ error, id }, 'Échec de la suppression de la catégorie')
    return serviceError('Échec de la suppression de la catégorie', 'INTERNAL')
  }
}

export async function getCategoryChildren(
  id: number,
  page: number = 1,
  limit: number = 50,
): Promise<PaginatedResult<unknown> & { error?: string; code?: ServiceErrorCode }> {
  try {
    const category = await prisma.categorieProduit.findUnique({
      where: { id_categorie: id },
    })
    if (!category) {
      return { ...createEmptyResult(page, limit, 'Catégorie introuvable'), data: [] as unknown[], ...serviceError('Catégorie introuvable', 'NOT_FOUND') }
    }

    const { skip } = getPaginationParams({ page, limit })

    const [children, total] = await Promise.all([
      prisma.categorieProduit.findMany({
        where: { id_categorie_parent: id },
        skip,
        take: limit,
        orderBy: { nom_categorie: 'asc' },
      }),
      prisma.categorieProduit.count({ where: { id_categorie_parent: id } }),
    ])

    return {
      data: children,
      meta: buildPaginationMeta(total, page, limit),
    }
  } catch (error) {
    log.error({ error, id, page, limit }, 'Échec de la récupération des catégories enfants')
    return { ...createEmptyResult(page, limit, 'Échec de la récupération des catégories enfants'), data: [] as unknown[], ...serviceError('Échec de la récupération des catégories enfants', 'INTERNAL') }
  }
}

export async function getCategoryProducts(
  id: number,
  page: number = 1,
  limit: number = 50,
): Promise<PaginatedResult<unknown> & { error?: string; code?: ServiceErrorCode }> {
  try {
    const category = await prisma.categorieProduit.findUnique({
      where: { id_categorie: id },
    })
    if (!category) {
      return { ...createEmptyResult(page, limit, 'Catégorie introuvable'), data: [] as unknown[], ...serviceError('Catégorie introuvable', 'NOT_FOUND') }
    }

    const { skip } = getPaginationParams({ page, limit })

    const [products, total] = await Promise.all([
      prisma.produit.findMany({
        where: { id_categorie: id },
        skip,
        take: limit,
        orderBy: { nom_produit: 'asc' },
      }),
      prisma.produit.count({ where: { id_categorie: id } }),
    ])

    return {
      data: products,
      meta: buildPaginationMeta(total, page, limit),
    }
  } catch (error) {
    log.error({ error, id, page, limit }, 'Échec de la récupération des produits de la catégorie')
    return { ...createEmptyResult(page, limit, 'Échec de la récupération des produits'), data: [] as unknown[], ...serviceError('Échec de la récupération des produits', 'INTERNAL') }
  }
}
