import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import { Prisma } from '@/lib/generated/prisma/client'
import { createLogger } from '@/lib/logger'
import { createEmptyResult, buildPaginationMeta, getPaginationParams } from '@/lib/pagination'
import type { PaginatedResult } from '@/lib/pagination'

const log = createLogger('entrepot-service')

export const warehouseCreateSchema = z.object({
  code_entrepot: z.string().min(1).max(50),
  nom_entrepot: z.string().min(1).max(255),
  adresse_entrepot: z.string().nullable().optional(),
  ville_entrepot: z.string().max(100).nullable().optional(),
  code_postal_entrepot: z.string().max(20).nullable().optional(),
  capacite_totale_unites: z.number().int().positive().nullable().optional(),
  nom_responsable: z.string().max(255).nullable().optional(),
  email_responsable: z.string().email().max(255).nullable().optional(),
  telephone_responsable: z.string().max(50).nullable().optional(),
  est_actif: z.boolean().default(true).optional(),
  est_entrepot_principal: z.boolean().default(false).optional(),
})

export const warehouseUpdateSchema = warehouseCreateSchema.partial()

type CreateInput = z.infer<typeof warehouseCreateSchema>
type UpdateInput = z.infer<typeof warehouseUpdateSchema>

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

export async function listEntrepots(
  page: number = 1,
  limit: number = 50,
  search?: string,
  principal?: string,
  sort: string = 'nom_entrepot',
  order: 'asc' | 'desc' = 'asc',
): Promise<PaginatedResult<unknown> & { error?: string }> {
  try {
    const effectiveSort = ALLOWED_SORT_FIELDS.includes(sort as AllowedSortField)
      ? (sort as AllowedSortField)
      : 'nom_entrepot'
    const { skip } = getPaginationParams({ page, limit })

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
        orderBy: { [effectiveSort]: order },
      }),
      prisma.entrepot.count({ where }),
    ])

    return {
      data: warehouses,
      meta: buildPaginationMeta(total, page, limit),
    }
  } catch (error) {
    log.error({ error, page, limit, search, principal }, 'Échec de la récupération des entrepôts')
    return createEmptyResult(page, limit, 'Échec de la récupération des entrepôts')
  }
}

export async function getEntrepotById(
  id: number,
): Promise<{ data?: unknown; error?: string }> {
  if (!Number.isFinite(id) || id <= 0) {
    return { error: 'ID entrepôt invalide' }
  }

  try {
    const warehouse = await prisma.entrepot.findUnique({
      where: { id_entrepot: id },
    })

    if (!warehouse) {
      return { error: 'Entrepôt introuvable' }
    }

    return { data: warehouse }
  } catch (error) {
    log.error({ error, id }, 'Échec de la récupération de l\'entrepôt')
    return { error: 'Échec de la récupération de l\'entrepôt' }
  }
}

export async function createEntrepot(
  input: CreateInput,
): Promise<{ data?: unknown; error?: string }> {
  const validationResult = warehouseCreateSchema.safeParse(input)
  if (!validationResult.success) {
    return { error: 'Validation échouée: ' + validationResult.error.issues.map((e) => e.message).join(', ') }
  }

  try {
    const existing = await prisma.entrepot.findUnique({
      where: { code_entrepot: validationResult.data.code_entrepot },
    })
    if (existing) {
      return { error: `Le code entrepôt ${validationResult.data.code_entrepot} existe déjà` }
    }

    const warehouse = await prisma.entrepot.create({
      data: validationResult.data,
    })
    return { data: warehouse }
  } catch (error) {
    log.error({ error, input: validationResult.data }, 'Échec de la création de l\'entrepôt')
    return { error: 'Échec de la création de l\'entrepôt' }
  }
}

export async function updateEntrepot(
  id: number,
  input: UpdateInput,
): Promise<{ data?: unknown; error?: string }> {
  const validationResult = warehouseUpdateSchema.safeParse(input)
  if (!validationResult.success) {
    return { error: 'Validation échouée: ' + validationResult.error.issues.map((e) => e.message).join(', ') }
  }

  try {
    const existing = await prisma.entrepot.findUnique({
      where: { id_entrepot: id },
    })
    if (!existing) {
      return { error: 'Entrepôt introuvable' }
    }

    if (validationResult.data.code_entrepot && validationResult.data.code_entrepot !== existing.code_entrepot) {
      const duplicate = await prisma.entrepot.findUnique({
        where: { code_entrepot: validationResult.data.code_entrepot },
      })
      if (duplicate) {
        return { error: `Le code entrepôt ${validationResult.data.code_entrepot} existe déjà` }
      }
    }

    const warehouse = await prisma.entrepot.update({
      where: { id_entrepot: id },
      data: validationResult.data,
    })
    return { data: warehouse }
  } catch (error) {
    log.error({ error, id, input: validationResult.data }, 'Échec de la mise à jour de l\'entrepôt')
    return { error: 'Échec de la mise à jour de l\'entrepôt' }
  }
}

export async function deleteEntrepot(
  id: number,
): Promise<{ data?: { success: boolean }; error?: string }> {
  try {
    const existing = await prisma.entrepot.findUnique({
      where: { id_entrepot: id },
    })
    if (!existing) {
      return { error: 'Entrepôt introuvable' }
    }

    await prisma.entrepot.update({
      where: { id_entrepot: id },
      data: { est_actif: false },
    })

    return { data: { success: true } }
  } catch (error) {
    log.error({ error, id }, 'Échec de la suppression de l\'entrepôt')
    return { error: 'Échec de la suppression de l\'entrepôt' }
  }
}

export async function getEntrepotStockLevels(
  id: number,
  page: number = 1,
  limit: number = 50,
): Promise<PaginatedResult<unknown> & { error?: string }> {
  try {
    const warehouse = await prisma.entrepot.findUnique({
      where: { id_entrepot: id },
    })
    if (!warehouse) {
      return { ...createEmptyResult(page, limit, 'Entrepôt introuvable'), data: [] as unknown[] }
    }

    const { skip } = getPaginationParams({ page, limit })

    const [stockLevels, total] = await Promise.all([
      prisma.niveauStock.findMany({
        where: { id_entrepot: id },
        skip,
        take: limit,
        orderBy: { date_creation: 'desc' },
        include: {
          produit: {
            select: { id_produit: true, code_produit: true, nom_produit: true },
          },
        },
      }),
      prisma.niveauStock.count({ where: { id_entrepot: id } }),
    ])

    return {
      data: stockLevels,
      meta: buildPaginationMeta(total, page, limit),
    }
  } catch (error) {
    log.error({ error, id, page, limit }, 'Échec de la récupération des niveaux de stock')
    return { ...createEmptyResult(page, limit, 'Échec de la récupération des niveaux de stock'), data: [] as unknown[] }
  }
}
