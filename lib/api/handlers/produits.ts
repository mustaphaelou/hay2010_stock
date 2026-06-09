import { apiHandler } from '@/lib/api/handler'
import {
  listArticles,
  getArticleById,
  createArticle,
  updateArticle,
  deleteArticle,
  getStockLevelsByArticle,
} from '@/lib/produits/produit-service'

export const listProductsHandler = apiHandler({
  rateLimit: 'read',
  execute: ({ query, pagination }) => {
    const { page, limit, sort, order } = pagination
    const search = query.search || undefined
    const categorie = query.categorie
    const famille = query.famille || undefined
    const actif = query.actif

    const filters: { search?: string; categorie?: number; famille?: string; actif?: boolean } = {}
    if (search) filters.search = search
    if (categorie) filters.categorie = parseInt(categorie, 10) || undefined
    if (famille) filters.famille = famille
    if (actif === 'true') filters.actif = true
    else if (actif === 'false') filters.actif = false

    return listArticles(page, limit, filters, sort, order)
  },
  responseType: 'paginated'
})

export const getProductByIdHandler = apiHandler({
  rateLimit: 'read',
  idParam: true,
  idErrorMessage: 'ID d\'article invalide',
  execute: ({ id }) => getArticleById(id!)
})

export const createProductHandler = apiHandler({
  rateLimit: 'write',
  type: 'write',
  invalidations: [{ kind: 'product' }],
  responseType: 'created',
  execute: ({ body, user }) => createArticle(body, user!.userId)
})

export const updateProductHandler = apiHandler({
  rateLimit: 'write',
  idParam: true,
  idErrorMessage: 'ID d\'article invalide',
  type: 'write',
  invalidations: (id) => [{ kind: 'product', productId: id }],
  execute: ({ id, body, user }) => updateArticle(id!, body, user!.userId)
})

export const deleteProductHandler = apiHandler({
  rateLimit: 'write',
  idParam: true,
  idErrorMessage: 'ID d\'article invalide',
  type: 'write',
  invalidations: (id) => [{ kind: 'product', productId: id }],
  responseType: 'noContent',
  execute: ({ id, user }) => deleteArticle(id!, user!.userId)
})

export const getProductStockLevelsHandler = apiHandler({
  rateLimit: 'read',
  idParam: true,
  idErrorMessage: 'ID d\'article invalide',
  execute: ({ id, pagination }) => {
    return getStockLevelsByArticle(id!, pagination.page, pagination.limit)
  },
  responseType: 'paginated'
})
