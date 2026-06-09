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
  execute: ({ query, pagination }) => {
    const { page, limit, sort, order } = pagination
    const search = query.search || undefined
    const principal = query.principal || undefined
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
  execute: ({ id, pagination }) => {
    return getEntrepotStockLevels(id!, pagination.page, pagination.limit)
  },
  responseType: 'paginated'
})
