import { NextRequest, NextResponse } from 'next/server'
import { requireApiKey } from '@/lib/api/auth'
import { apiSuccess, apiPaginated, apiCreated, apiNoContent, apiError } from '@/lib/api/response'
import { handleServiceError } from '@/lib/api/service-error'
import { ValidationError } from '@/lib/errors'
import {
  listArticles,
  getArticleById,
  createArticle,
  updateArticle,
  deleteArticle,
  getStockLevelsByArticle,
} from '@/lib/stock/stock-service'

export async function listProductsHandler(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const url = request.nextUrl
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)
    const search = url.searchParams.get('search') || undefined
    const categorie = url.searchParams.get('categorie')
    const famille = url.searchParams.get('famille') || undefined
    const actif = url.searchParams.get('actif')
    const sort = url.searchParams.get('sort') || undefined
    const order = (url.searchParams.get('order') || 'asc').toLowerCase() === 'desc' ? 'desc' as const : 'asc' as const

    const filters: { search?: string; categorie?: number; famille?: string; actif?: boolean } = {}
    if (search) filters.search = search
    if (categorie) filters.categorie = parseInt(categorie, 10) || undefined
    if (famille) filters.famille = famille
    if (actif === 'true') filters.actif = true
    else if (actif === 'false') filters.actif = false

    const result = await listArticles(page, limit, filters, sort, order)

    handleServiceError(result)

    return apiPaginated(result.data, result.meta)
  } catch (error) {
    return apiError(error)
  }
}

export async function getProductByIdHandler(request: NextRequest, id: number): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    if (isNaN(id)) {
      throw new ValidationError('ID d\'article invalide')
    }

    const result = await getArticleById(id)

    handleServiceError(result)

    return apiSuccess(result.data)
  } catch (error) {
    return apiError(error)
  }
}

export async function createProductHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const apiUser = await requireApiKey(request)

    const body = await request.json()
    const result = await createArticle(body, apiUser.userId)

    handleServiceError(result)

    return apiCreated(result.data)
  } catch (error) {
    return apiError(error)
  }
}

export async function updateProductHandler(request: NextRequest, id: number): Promise<NextResponse> {
  try {
    const apiUser = await requireApiKey(request)

    if (isNaN(id)) {
      throw new ValidationError('ID d\'article invalide')
    }

    const body = await request.json()
    const result = await updateArticle(id, body, apiUser.userId)

    handleServiceError(result)

    return apiSuccess(result.data)
  } catch (error) {
    return apiError(error)
  }
}

export async function deleteProductHandler(request: NextRequest, id: number): Promise<NextResponse> {
  try {
    const apiUser = await requireApiKey(request)

    if (isNaN(id)) {
      throw new ValidationError('ID d\'article invalide')
    }

    const result = await deleteArticle(id, apiUser.userId)

    handleServiceError(result)

    return apiNoContent()
  } catch (error) {
    return apiError(error)
  }
}

export async function getProductStockLevelsHandler(request: NextRequest, id: number): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    if (isNaN(id)) {
      throw new ValidationError('ID d\'article invalide')
    }

    const url = request.nextUrl
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)

    const result = await getStockLevelsByArticle(id, page, limit)

    handleServiceError(result)

    return apiPaginated(result.data, result.meta)
  } catch (error) {
    return apiError(error)
  }
}
