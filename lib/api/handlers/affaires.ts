import { NextRequest, NextResponse } from 'next/server'
import { requireApiKey } from '@/lib/api/auth'
import { apiSuccess, apiPaginated, apiCreated, apiNoContent, apiError } from '@/lib/api/response'
import { handleServiceError } from '@/lib/api/service-error'
import { ValidationError } from '@/lib/errors'
import {
  getAffaires,
  getAffaireById,
  createAffaire,
  updateAffaire,
  deleteAffaire,
  getAffaireDocumentsById,
} from '@/lib/affaires/affaire-service'
import type { GetAffairesInput } from '@/lib/affaires/validation'

export async function listAffairesHandler(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const url = request.nextUrl
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)

    const filters: Partial<GetAffairesInput> = {}
    const type = url.searchParams.get('type') || undefined
    const statut = url.searchParams.get('statut') || undefined
    const client = url.searchParams.get('client') || undefined
    const search = url.searchParams.get('search') || undefined

    if (type) filters.type_affaire = type
    if (statut) filters.statut_affaire = statut
    if (search) filters.search = search
    if (client) (filters as Record<string, unknown>).id_client = parseInt(client, 10) || undefined

    const sort = url.searchParams.get('sort') || undefined
    const order = (url.searchParams.get('order') || 'desc').toLowerCase() === 'asc' ? 'asc' as const : 'desc' as const

    const result = await getAffaires(page, limit, filters, sort, order)

    handleServiceError(result)

    return apiPaginated(result.data, result.meta)
  } catch (error) {
    return apiError(error)
  }
}

export async function getAffaireByIdHandler(request: NextRequest, id: number): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    if (isNaN(id)) {
      throw new ValidationError('ID d\'affaire invalide')
    }

    const result = await getAffaireById(id)

    handleServiceError(result)

    return apiSuccess(result.data)
  } catch (error) {
    return apiError(error)
  }
}

export async function createAffaireHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const apiUser = await requireApiKey(request)

    const body = await request.json()
    const result = await createAffaire(body, apiUser.userId)

    handleServiceError(result)

    return apiCreated(result.data)
  } catch (error) {
    return apiError(error)
  }
}

export async function updateAffaireHandler(request: NextRequest, id: number): Promise<NextResponse> {
  try {
    const apiUser = await requireApiKey(request)

    if (isNaN(id)) {
      throw new ValidationError('ID d\'affaire invalide')
    }

    const body = await request.json()
    const result = await updateAffaire(id, body, apiUser.userId)

    handleServiceError(result)

    return apiSuccess(result.data)
  } catch (error) {
    return apiError(error)
  }
}

export async function deleteAffaireHandler(request: NextRequest, id: number): Promise<NextResponse> {
  try {
    const apiUser = await requireApiKey(request)

    if (isNaN(id)) {
      throw new ValidationError('ID d\'affaire invalide')
    }

    const result = await deleteAffaire(id, apiUser.userId)

    handleServiceError(result)

    return apiNoContent()
  } catch (error) {
    return apiError(error)
  }
}

export async function getAffaireDocumentsHandler(request: NextRequest, id: number): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    if (isNaN(id)) {
      throw new ValidationError('ID d\'affaire invalide')
    }

    const url = request.nextUrl
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)

    const result = await getAffaireDocumentsById(id, page, limit)

    handleServiceError(result)

    return apiPaginated(result.data, result.meta)
  } catch (error) {
    return apiError(error)
  }
}
