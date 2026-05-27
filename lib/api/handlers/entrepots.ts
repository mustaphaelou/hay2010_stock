import { NextRequest, NextResponse } from 'next/server'
import { requireApiKey } from '@/lib/api/auth'
import { apiSuccess, apiPaginated, apiCreated, apiNoContent, apiError } from '@/lib/api/response'
import { handleServiceError } from '@/lib/api/service-error'
import { ValidationError } from '@/lib/errors'
import {
  listEntrepots,
  getEntrepotById,
  createEntrepot,
  updateEntrepot,
  deleteEntrepot,
  getEntrepotStockLevels,
} from '@/lib/entrepots/entrepot-service'
import { executeWrite } from '@/lib/actions/execute-write'

export async function listWarehousesHandler(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const url = request.nextUrl
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)
    const search = url.searchParams.get('search') || undefined
    const principal = url.searchParams.get('principal') || undefined
    const sort = url.searchParams.get('sort') || undefined
    const order = (url.searchParams.get('order') || 'asc').toLowerCase() === 'desc' ? 'desc' as const : 'asc' as const

    const result = await listEntrepots(page, limit, search, principal, sort, order)

    handleServiceError(result)

    return apiPaginated(result.data, result.meta)
  } catch (error) {
    return apiError(error)
  }
}

export async function getWarehouseByIdHandler(request: NextRequest, id: number): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    if (isNaN(id)) {
      throw new ValidationError('ID entrepôt invalide')
    }

    const result = await getEntrepotById(id)

    handleServiceError(result)

    return apiSuccess(result.data!)
  } catch (error) {
    return apiError(error)
  }
}

export async function createWarehouseHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const apiUser = await requireApiKey(request)

    const body = await request.json()
    const result = await executeWrite({
      user: { id: apiUser.userId, email: '', name: '', role: apiUser.role },
      writeFn: () => createEntrepot(body),
      invalidations: [{ kind: 'warehouse' }],
    })

    handleServiceError(result)

    return apiCreated(result.data!)
  } catch (error) {
    return apiError(error)
  }
}

export async function updateWarehouseHandler(request: NextRequest, id: number): Promise<NextResponse> {
  try {
    const apiUser = await requireApiKey(request)

    if (isNaN(id)) {
      throw new ValidationError('ID entrepôt invalide')
    }

    const body = await request.json()
    const result = await executeWrite({
      user: { id: apiUser.userId, email: '', name: '', role: apiUser.role },
      writeFn: () => updateEntrepot(id, body),
      invalidations: [{ kind: 'warehouse', warehouseId: id }],
    })

    handleServiceError(result)

    return apiSuccess(result.data!)
  } catch (error) {
    return apiError(error)
  }
}

export async function deleteWarehouseHandler(request: NextRequest, id: number): Promise<NextResponse> {
  try {
    const apiUser = await requireApiKey(request)

    if (isNaN(id)) {
      throw new ValidationError('ID entrepôt invalide')
    }

    const result = await executeWrite({
      user: { id: apiUser.userId, email: '', name: '', role: apiUser.role },
      writeFn: () => deleteEntrepot(id),
      invalidations: [{ kind: 'warehouse', warehouseId: id }],
    })

    handleServiceError(result)

    return apiNoContent()
  } catch (error) {
    return apiError(error)
  }
}

export async function getWarehouseStockLevelsHandler(request: NextRequest, id: number): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    if (isNaN(id)) {
      throw new ValidationError('ID entrepôt invalide')
    }

    const url = request.nextUrl
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)

    const result = await getEntrepotStockLevels(id, page, limit)

    handleServiceError(result)

    return apiPaginated(result.data, result.meta)
  } catch (error) {
    return apiError(error)
  }
}
