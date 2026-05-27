import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import { Prisma } from '@/lib/generated/prisma/client'
import { createLogger } from '@/lib/logger'
import { createEmptyResult, buildPaginationMeta, getPaginationParams } from '@/lib/pagination'
import type { PaginatedResult } from '@/lib/pagination'

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
): Promise<PaginatedResult<unknown> & { error?: string }> {
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
    return createEmptyResult(page, limit, 'Échec de la récupération des catégories')
  }
}

export async function getCategoryById(
  id: number,
): Promise<{ data?: unknown; error?: string }> {
  if (!Number.isFinite(id) || id <= 0) {
    return { error: 'ID catégorie invalide' }
  }

  try {
    const category = await prisma.categorieProduit.findUnique({
      where: { id_categorie: id },
    })

    if (!category) {
      return { error: 'Catégorie introuvable' }
    }

    return { data: category }
  } catch (error) {
    log.error({ error, id }, 'Échec de la récupération de la catégorie')
    return { error: 'Échec de la récupération de la catégorie' }
  }
}

export async function createCategory(
  input: CreateInput,
): Promise<{ data?: unknown; error?: string }> {
  const validationResult = categoryCreateSchema.safeParse(input)
  if (!validationResult.success) {
    return { error: 'Validation échouée: ' + validationResult.error.issues.map((e) => e.message).join(', ') }
  }

  try {
    const existing = await prisma.categorieProduit.findUnique({
      where: { code_categorie: validationResult.data.code_categorie },
    })
    if (existing) {
      return { error: `La catégorie avec le code ${validationResult.data.code_categorie} existe déjà` }
    }

    const category = await prisma.categorieProduit.create({
      data: validationResult.data,
    })
    return { data: category }
  } catch (error) {
    log.error({ error, input: validationResult.data }, 'Échec de la création de la catégorie')
    return { error: 'Échec de la création de la catégorie' }
  }
}

export async function updateCategory(
  id: number,
  input: UpdateInput,
): Promise<{ data?: unknown; error?: string }> {
  const validationResult = categoryUpdateSchema.safeParse(input)
  if (!validationResult.success) {
    return { error: 'Validation échouée: ' + validationResult.error.issues.map((e) => e.message).join(', ') }
  }

  try {
    const existing = await prisma.categorieProduit.findUnique({
      where: { id_categorie: id },
    })
    if (!existing) {
      return { error: 'Catégorie introuvable' }
    }

    if (validationResult.data.code_categorie && validationResult.data.code_categorie !== existing.code_categorie) {
      const duplicate = await prisma.categorieProduit.findUnique({
        where: { code_categorie: validationResult.data.code_categorie },
      })
      if (duplicate) {
        return { error: `La catégorie avec le code ${validationResult.data.code_categorie} existe déjà` }
      }
    }

    if (validationResult.data.id_categorie_parent !== undefined && validationResult.data.id_categorie_parent === id) {
      return { error: 'ID catégorie parent invalide: une catégorie ne peut pas être son propre parent' }
    }

    const category = await prisma.categorieProduit.update({
      where: { id_categorie: id },
      data: validationResult.data,
    })
    return { data: category }
  } catch (error) {
    log.error({ error, id, input: validationResult.data }, 'Échec de la mise à jour de la catégorie')
    return { error: 'Échec de la mise à jour de la catégorie' }
  }
}

export async function deleteCategory(
  id: number,
): Promise<{ data?: { success: boolean }; error?: string }> {
  try {
    const existing = await prisma.categorieProduit.findUnique({
      where: { id_categorie: id },
    })
    if (!existing) {
      return { error: 'Catégorie introuvable' }
    }

    const childCount = await prisma.categorieProduit.count({
      where: { id_categorie_parent: id },
    })
    if (childCount > 0) {
      return { error: 'Suppression invalide: la catégorie a des catégories enfants' }
    }

    await prisma.categorieProduit.delete({
      where: { id_categorie: id },
    })

    return { data: { success: true } }
  } catch (error) {
    log.error({ error, id }, 'Échec de la suppression de la catégorie')
    return { error: 'Échec de la suppression de la catégorie' }
  }
}

export async function getCategoryChildren(
  id: number,
  page: number = 1,
  limit: number = 50,
): Promise<PaginatedResult<unknown> & { error?: string }> {
  try {
    const category = await prisma.categorieProduit.findUnique({
      where: { id_categorie: id },
    })
    if (!category) {
      return { ...createEmptyResult(page, limit, 'Catégorie introuvable'), data: [] as unknown[] }
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
    return { ...createEmptyResult(page, limit, 'Échec de la récupération des catégories enfants'), data: [] as unknown[] }
  }
}

export async function getCategoryProducts(
  id: number,
  page: number = 1,
  limit: number = 50,
): Promise<PaginatedResult<unknown> & { error?: string }> {
  try {
    const category = await prisma.categorieProduit.findUnique({
      where: { id_categorie: id },
    })
    if (!category) {
      return { ...createEmptyResult(page, limit, 'Catégorie introuvable'), data: [] as unknown[] }
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
    return { ...createEmptyResult(page, limit, 'Échec de la récupération des produits'), data: [] as unknown[] }
  }
}
