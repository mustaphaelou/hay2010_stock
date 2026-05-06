import { NextRequest, NextResponse } from 'next/server'
import { getApiUser, requireApiKey } from '@/lib/api/auth'
import { apiSuccess, apiPaginated, apiCreated, apiNoContent, apiError } from '@/lib/api/response'
import {
  partnerCreateSchema,
  partnerUpdateSchema,
  paginationSchema,
} from '@/lib/api/validators/partenaires'
import { ValidationError, NotFoundError, ConflictError } from '@/lib/errors'
import { createValidationErrorFromZod } from '@/lib/errors'
import { getPartnerById, deletePartner as deletePartnerService, createPartner as createPartnerService, updatePartner as updatePartnerService, getPartners as getPartnersService, getPartnerDocuments as getPartnerDocumentsService } from '@/lib/partners/partner-service'


function extractIdFromUrl(request: NextRequest): number {
  const segments = request.nextUrl.pathname.split('/')
  const lastSegment = segments[segments.length - 1]
  const id = parseInt(lastSegment, 10)
  if (isNaN(id)) {
    throw new ValidationError('Invalid partner ID')
  }
  return id
}

function parsePagination(request: NextRequest) {
  const url = request.nextUrl
  const page = parseInt(url.searchParams.get('page') || '1', 10)
  const limit = parseInt(url.searchParams.get('limit') || '50', 10)
  const parsed = paginationSchema.safeParse({ page, limit })
  if (!parsed.success) {
    throw createValidationErrorFromZod(parsed.error)
  }
  return parsed.data
}

async function getAuthenticatedUserId(request: NextRequest): Promise<string> {
  const apiUser = await getApiUser(request)
  if (!apiUser) return 'system'
  return apiUser.userId
}

export async function listPartnersHandler(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const { page, limit } = parsePagination(request)
    const url = request.nextUrl
    const type = url.searchParams.get('type') || undefined
    const search = url.searchParams.get('search') || undefined
    const sortParam = url.searchParams.get('sort') || 'nom_partenaire'
    const orderParam = (url.searchParams.get('order') || 'asc').toLowerCase()

    const order = orderParam === 'desc' ? ('desc' as const) : ('asc' as const)

    const validTypes = ['CLIENT', 'FOURNISSEUR', 'LES_DEUX']
    if (type && type !== 'all' && !validTypes.includes(type)) {
      throw new ValidationError('Invalid type filter. Must be CLIENT, FOURNISSEUR, or LES_DEUX')
    }

    const result = await getPartnersService(type, page, limit, search, sortParam, order)

    if (result.error) {
      throw new Error(result.error)
    }

    return apiPaginated(result.data, result.meta)
  } catch (error) {
    return apiError(error)
  }
}

export async function getPartnerByIdHandler(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const id = extractIdFromUrl(request)

    const result = await getPartnerById(id)

    if (result.error && result.error !== 'Partner not found') {
      throw new Error(result.error)
    }
    if (!result.data) {
      throw new NotFoundError('Partner')
    }

    return apiSuccess(result.data)
  } catch (error) {
    return apiError(error)
  }
}

export async function createPartnerHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const apiUser = await requireApiKey(request)

    const body = await request.json()
    const parsed = partnerCreateSchema.safeParse(body)
    if (!parsed.success) {
      throw createValidationErrorFromZod(parsed.error)
    }

    const result = await createPartnerService(parsed.data, apiUser.userId)

    if (result.error) {
      if (result.error.includes('already exists')) {
        throw new ConflictError(result.error)
      }
      throw new Error(result.error)
    }

    return apiCreated(result.data)
  } catch (error) {
    return apiError(error)
  }
}

export async function updatePartnerHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const apiUser = await requireApiKey(request)

    const id = extractIdFromUrl(request)

    const body = await request.json()
    const parsed = partnerUpdateSchema.safeParse(body)
    if (!parsed.success) {
      throw createValidationErrorFromZod(parsed.error)
    }

    const result = await updatePartnerService(id, parsed.data, apiUser.userId)

    if (result.error) {
      if (result.error === 'Partner not found') {
        throw new NotFoundError('Partner')
      }
      if (result.error.includes('already exists')) {
        throw new ConflictError(result.error)
      }
      throw new Error(result.error)
    }

    return apiSuccess(result.data)
  } catch (error) {
    return apiError(error)
  }
}

export async function deletePartnerHandler(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const id = extractIdFromUrl(request)
    const userId = await getAuthenticatedUserId(request)

    const result = await deletePartnerService(id, userId)

    if (result.error) {
      if (result.error === 'Partner not found') {
        throw new NotFoundError('Partner')
      }
      throw new Error(result.error)
    }

    return apiNoContent()
  } catch (error) {
    return apiError(error)
  }
}

export async function getPartnerDocumentsHandler(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const segments = request.nextUrl.pathname.split('/')
    const idSegment = segments[segments.length - 2] ?? ''
    const partnerId = parseInt(idSegment, 10)
    if (isNaN(partnerId)) {
      throw new ValidationError('Invalid partner ID')
    }

    const { page, limit } = parsePagination(request)

    const result = await getPartnerDocumentsService(partnerId, page, limit)

    if (result.error) {
      if (result.error === 'Partner not found') {
        throw new NotFoundError('Partner')
      }
      throw new Error(result.error)
    }

    return apiPaginated(result.data, result.meta)
  } catch (error) {
    return apiError(error)
  }
}
