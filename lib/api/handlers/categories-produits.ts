import { NextRequest, NextResponse } from 'next/server'
import { requireApiKey } from '@/lib/api/auth'
import { apiSuccess, apiPaginated, apiCreated, apiNoContent, apiError } from '@/lib/api/response'
import { handleServiceError } from '@/lib/api/service-error'
import { ValidationError } from '@/lib/errors'
import {
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryChildren,
  getCategoryProducts,
} from '@/lib/categories/categorie-produit-service'
import { executeWrite } from '@/lib/actions/execute-write'

export async function listCategoriesHandler(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const url = request.nextUrl
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)
    const search = url.searchParams.get('search') || undefined
    const parent = url.searchParams.get('parent') || undefined
    const sort = url.searchParams.get('sort') || undefined
    const order = (url.searchParams.get('order') || 'asc').toLowerCase() === 'desc' ? 'desc' as const : 'asc' as const

    const result = await listCategories(page, limit, search, parent, sort, order)

    handleServiceError(result)

    return apiPaginated(result.data, result.meta)
  } catch (error) {
    return apiError(error)
  }
}

export async function getCategoryByIdHandler(request: NextRequest, id: number): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    if (isNaN(id)) {
      throw new ValidationError('ID catégorie invalide')
    }

    const result = await getCategoryById(id)

    handleServiceError(result)

    return apiSuccess(result.data!)
  } catch (error) {
    return apiError(error)
  }
}

export async function createCategoryHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const apiUser = await requireApiKey(request)

    const body = await request.json()
    const result = await executeWrite({
      user: { id: apiUser.userId, email: '', name: '', role: apiUser.role },
      writeFn: () => createCategory(body),
      invalidations: [{ kind: 'category' }],
    })

    handleServiceError(result)

    return apiCreated(result.data!)
  } catch (error) {
    return apiError(error)
  }
}

export async function updateCategoryHandler(request: NextRequest, id: number): Promise<NextResponse> {
  try {
    const apiUser = await requireApiKey(request)

    if (isNaN(id)) {
      throw new ValidationError('ID catégorie invalide')
    }

    const body = await request.json()
    const result = await executeWrite({
      user: { id: apiUser.userId, email: '', name: '', role: apiUser.role },
      writeFn: () => updateCategory(id, body),
      invalidations: [{ kind: 'category', categoryId: id }],
    })

    handleServiceError(result)

    return apiSuccess(result.data!)
  } catch (error) {
    return apiError(error)
  }
}

export async function deleteCategoryHandler(request: NextRequest, id: number): Promise<NextResponse> {
  try {
    const apiUser = await requireApiKey(request)

    if (isNaN(id)) {
      throw new ValidationError('ID catégorie invalide')
    }

    const result = await executeWrite({
      user: { id: apiUser.userId, email: '', name: '', role: apiUser.role },
      writeFn: () => deleteCategory(id),
      invalidations: [{ kind: 'category', categoryId: id }],
    })

    handleServiceError(result)

    return apiNoContent()
  } catch (error) {
    return apiError(error)
  }
}

export async function getCategoryChildrenHandler(request: NextRequest, id: number): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    if (isNaN(id)) {
      throw new ValidationError('ID catégorie invalide')
    }

    const url = request.nextUrl
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)

    const result = await getCategoryChildren(id, page, limit)

    handleServiceError(result)

    return apiPaginated(result.data, result.meta)
  } catch (error) {
    return apiError(error)
  }
}

export async function getCategoryProductsHandler(request: NextRequest, id: number): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    if (isNaN(id)) {
      throw new ValidationError('ID catégorie invalide')
    }

    const url = request.nextUrl
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)

    const result = await getCategoryProducts(id, page, limit)

    handleServiceError(result)

    return apiPaginated(result.data, result.meta)
  } catch (error) {
    return apiError(error)
  }
}
