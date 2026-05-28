import { apiHandler } from '@/lib/api/handler'
import {
  listEntrepots,
  getEntrepotById,
  createEntrepot,
  updateEntrepot,
  deleteEntrepot,
  getEntrepotStockLevels,
} from '@/lib/entrepots/entrepot-service'

export const listWarehousesHandler = apiHandler({
  rateLimit: 'read',
  execute: ({ query }) => {
    const page = parseInt(query.page || '1', 10)
    const limit = parseInt(query.limit || '50', 10)
    const search = query.search || undefined
    const principal = query.principal || undefined
    const sort = query.sort || undefined
    const order = (query.order || 'asc').toLowerCase() === 'desc' ? 'desc' as const : 'asc' as const
    return listEntrepots(page, limit, search, principal, sort, order)
  },
  responseType: 'paginated'
})

export const getWarehouseByIdHandler = apiHandler({
  rateLimit: 'read',
  idParam: true,
  idErrorMessage: 'ID entrepôt invalide',
  execute: ({ id }) => getEntrepotById(id!)
})

export const createWarehouseHandler = apiHandler({
  rateLimit: 'write',
  type: 'write',
  invalidations: [{ kind: 'warehouse' }],
  responseType: 'created',
  execute: ({ body }) => createEntrepot(body)
})

export const updateWarehouseHandler = apiHandler({
  rateLimit: 'write',
  idParam: true,
  idErrorMessage: 'ID entrepôt invalide',
  type: 'write',
  invalidations: (id) => [{ kind: 'warehouse', warehouseId: id }],
  execute: ({ id, body }) => updateEntrepot(id!, body)
})

export const deleteWarehouseHandler = apiHandler({
  rateLimit: 'write',
  idParam: true,
  idErrorMessage: 'ID entrepôt invalide',
  type: 'write',
  invalidations: (id) => [{ kind: 'warehouse', warehouseId: id }],
  responseType: 'noContent',
  execute: ({ id }) => deleteEntrepot(id!)
})

export const getWarehouseStockLevelsHandler = apiHandler({
  rateLimit: 'read',
  idParam: true,
  idErrorMessage: 'ID entrepôt invalide',
  execute: ({ id, query }) => {
    const page = parseInt(query.page || '1', 10)
    const limit = parseInt(query.limit || '50', 10)
    return getEntrepotStockLevels(id!, page, limit)
  },
  responseType: 'paginated'
})
