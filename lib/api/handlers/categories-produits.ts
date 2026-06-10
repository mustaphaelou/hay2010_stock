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
import { serviceError } from '@/lib/service-result'

export const listCategoriesHandler = apiHandler({
  rateLimit: 'read',
  execute: ({ query, pagination }) => {
    const { page, limit, sort, order } = pagination
    const search = query.search || undefined
    const parent = query.parent || undefined
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
  execute: ({ id, body }) => {
    if (body.id_categorie_parent !== undefined && body.id_categorie_parent === id) {
      return serviceError('ID catégorie parent invalide: une catégorie ne peut pas être son propre parent', 'VALIDATION')
    }
    return updateCategory(id!, body)
  }
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
  execute: ({ id, pagination }) => {
    return getCategoryChildren(id!, pagination.page, pagination.limit)
  },
  responseType: 'paginated'
})

export const getCategoryProductsHandler = apiHandler({
  rateLimit: 'read',
  idParam: true,
  idErrorMessage: 'ID catégorie invalide',
  execute: ({ id, pagination }) => {
    return getCategoryProducts(id!, pagination.page, pagination.limit)
  },
  responseType: 'paginated'
})
