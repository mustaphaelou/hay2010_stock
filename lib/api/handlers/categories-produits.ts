import { apiHandler } from '@/lib/api/handler'
import {
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryChildren,
  getCategoryProducts,
} from '@/lib/categories/categorie-produit-service'

export const listCategoriesHandler = apiHandler({
  rateLimit: 'read',
  execute: ({ query }) => {
    const page = parseInt(query.page || '1', 10)
    const limit = parseInt(query.limit || '50', 10)
    const search = query.search || undefined
    const parent = query.parent || undefined
    const sort = query.sort || undefined
    const order = (query.order || 'asc').toLowerCase() === 'desc' ? 'desc' as const : 'asc' as const
    return listCategories(page, limit, search, parent, sort, order)
  },
  responseType: 'paginated'
})

export const getCategoryByIdHandler = apiHandler({
  rateLimit: 'read',
  idParam: true,
  idErrorMessage: 'ID catégorie invalide',
  execute: ({ id }) => getCategoryById(id!)
})

export const createCategoryHandler = apiHandler({
  rateLimit: 'write',
  type: 'write',
  invalidations: [{ kind: 'category' }],
  responseType: 'created',
  execute: ({ body }) => createCategory(body)
})

export const updateCategoryHandler = apiHandler({
  rateLimit: 'write',
  idParam: true,
  idErrorMessage: 'ID catégorie invalide',
  type: 'write',
  invalidations: (id) => [{ kind: 'category', categoryId: id }],
  execute: ({ id, body }) => updateCategory(id!, body)
})

export const deleteCategoryHandler = apiHandler({
  rateLimit: 'write',
  idParam: true,
  idErrorMessage: 'ID catégorie invalide',
  type: 'write',
  invalidations: (id) => [{ kind: 'category', categoryId: id }],
  responseType: 'noContent',
  execute: ({ id }) => deleteCategory(id!)
})

export const getCategoryChildrenHandler = apiHandler({
  rateLimit: 'read',
  idParam: true,
  idErrorMessage: 'ID catégorie invalide',
  execute: ({ id, query }) => {
    const page = parseInt(query.page || '1', 10)
    const limit = parseInt(query.limit || '50', 10)
    return getCategoryChildren(id!, page, limit)
  },
  responseType: 'paginated'
})

export const getCategoryProductsHandler = apiHandler({
  rateLimit: 'read',
  idParam: true,
  idErrorMessage: 'ID catégorie invalide',
  execute: ({ id, query }) => {
    const page = parseInt(query.page || '1', 10)
    const limit = parseInt(query.limit || '50', 10)
    return getCategoryProducts(id!, page, limit)
  },
  responseType: 'paginated'
})
