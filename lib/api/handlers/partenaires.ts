import { NextRequest, NextResponse } from 'next/server'
import { requireApiKey } from '@/lib/api/auth'
import { apiSuccess, apiPaginated, apiCreated, apiNoContent, apiError } from '@/lib/api/response'
import { handleServiceError } from '@/lib/api/service-error'
import { ValidationError } from '@/lib/errors'
import {
  getPartnerById,
  deletePartner,
  createPartner,
  updatePartner,
  getPartners,
  getPartnerDocuments,
} from '@/lib/partners/partner-service'

export async function listPartnersHandler(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const url = request.nextUrl
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)
    const type = url.searchParams.get('type') || undefined
    const search = url.searchParams.get('search') || undefined
    const sort = url.searchParams.get('sort') || undefined
    const order = (url.searchParams.get('order') || 'asc').toLowerCase() === 'desc' ? 'desc' as const : 'asc' as const

    const result = await getPartners(type, page, limit, search, sort, order)

    handleServiceError(result)

    return apiPaginated(result.data, result.meta)
  } catch (error) {
    return apiError(error)
  }
}

export async function getPartnerByIdHandler(request: NextRequest, id: number): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    if (isNaN(id)) {
      throw new ValidationError('ID partenaire invalide')
    }

    const result = await getPartnerById(id)

    handleServiceError(result)

    return apiSuccess(result.data)
  } catch (error) {
    return apiError(error)
  }
}

export async function createPartnerHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const apiUser = await requireApiKey(request)

    const body = await request.json()
    const result = await createPartner(body, apiUser.userId)

    handleServiceError(result)

    return apiCreated(result.data)
  } catch (error) {
    return apiError(error)
  }
}

export async function updatePartnerHandler(request: NextRequest, id: number): Promise<NextResponse> {
  try {
    const apiUser = await requireApiKey(request)

    if (isNaN(id)) {
      throw new ValidationError('ID partenaire invalide')
    }

    const body = await request.json()
    const result = await updatePartner(id, body, apiUser.userId)

    handleServiceError(result)

    return apiSuccess(result.data)
  } catch (error) {
    return apiError(error)
  }
}

export async function deletePartnerHandler(request: NextRequest, id: number): Promise<NextResponse> {
  try {
    const apiUser = await requireApiKey(request)

    if (isNaN(id)) {
      throw new ValidationError('ID partenaire invalide')
    }

    const result = await deletePartner(id, apiUser.userId)

    handleServiceError(result)

    return apiNoContent()
  } catch (error) {
    return apiError(error)
  }
}

export async function getPartnerDocumentsHandler(request: NextRequest, id: number): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    if (isNaN(id)) {
      throw new ValidationError('ID partenaire invalide')
    }

    const url = request.nextUrl
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)

    const result = await getPartnerDocuments(id, page, limit)

    handleServiceError(result)

    return apiPaginated(result.data, result.meta)
  } catch (error) {
    return apiError(error)
  }
}
