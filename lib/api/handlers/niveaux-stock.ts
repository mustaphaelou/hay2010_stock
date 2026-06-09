import { apiHandler } from '@/lib/api/handler'
import { prisma } from '@/lib/db/prisma'
import { ValidationError, NotFoundError } from '@/lib/errors'
import {
  createStockLevel,
  adjustStockLevel,
  deleteStockLevel,
} from '@/lib/stock/stock-service'

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

export const listStockLevelsHandler = apiHandler({
  rateLimit: 'read',
  pagination: { defaultSort: 'date_creation', defaultOrder: 'desc' },
  execute: async ({ query, pagination }) => {
    const { page, limit } = pagination
    const produit = query.produit || undefined
    const entrepot = query.entrepot || undefined

    const sort = ALLOWED_SORT_FIELDS.includes(pagination.sort as AllowedSortField)
      ? (pagination.sort as AllowedSortField)
      : 'date_creation'
    const order = pagination.order

    const skip = (page - 1) * limit

    const where: any = {}
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

    return {
      data: stockLevels,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      }
    }
  },
  responseType: 'paginated'
})

export const getStockLevelByIdHandler = apiHandler({
  rateLimit: 'read',
  idParam: true,
  idErrorMessage: 'Invalid stock level ID',
  execute: async ({ id }) => {
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

    return { data: stockLevel }
  }
})

export const createStockLevelHandler = apiHandler({
  rateLimit: 'write',
  type: 'write',
  invalidations: [{ kind: 'stock' }],
  responseType: 'created',
  execute: ({ body, user }) => createStockLevel(body, user!.userId)
})

export const adjustStockLevelHandler = apiHandler({
  rateLimit: 'write',
  type: 'write',
  invalidations: [{ kind: 'stock' }],
  execute: ({ body, user }) => adjustStockLevel(body, user!.userId)
})

export const deleteStockLevelHandler = apiHandler({
  rateLimit: 'write',
  idParam: true,
  idErrorMessage: 'Invalid stock level ID',
  type: 'write',
  invalidations: [{ kind: 'stock' }],
  responseType: 'noContent',
  execute: ({ id }) => deleteStockLevel(id!)
})