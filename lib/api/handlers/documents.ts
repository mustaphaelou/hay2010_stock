import { NextRequest, NextResponse } from 'next/server'
import { requireApiKey } from '@/lib/api/auth'
import { apiSuccess, apiPaginated, apiCreated, apiNoContent, apiError } from '@/lib/api/response'
import { handleServiceError } from '@/lib/api/service-error'
import { ValidationError } from '@/lib/errors'
import {
  listDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  deleteDocument,
  getDocumentLinesById,
} from '@/lib/documents/document-service'
import { apiWrite } from '@/lib/actions/api-write'

export async function listDocumentsHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const apiUser = await requireApiKey(request)

    const url = request.nextUrl
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)

    const result = await listDocuments({
      page,
      limit,
      search: url.searchParams.get('search') || undefined,
      type_document: url.searchParams.get('type_document') || undefined,
      domaine: url.searchParams.get('domaine_document') || undefined,
      statut_document: url.searchParams.get('statut_document') || undefined,
      id_partenaire: url.searchParams.get('id_partenaire') ? parseInt(url.searchParams.get('id_partenaire')!, 10) : undefined,
      id_affaire: url.searchParams.get('id_affaire') ? parseInt(url.searchParams.get('id_affaire')!, 10) : undefined,
      sort: url.searchParams.get('sort') || undefined,
      order: url.searchParams.get('order') === 'asc' ? 'asc' : undefined,
    }, { id: apiUser.userId, role: apiUser.role })

    handleServiceError(result)

    return apiPaginated(result.data, result.meta)
  } catch (error) {
    return apiError(error)
  }
}

export async function getDocumentByIdHandler(request: NextRequest, id: number): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const result = await getDocumentById(id)

    handleServiceError(result)

    return apiSuccess(result.data!)
  } catch (error) {
    return apiError(error)
  }
}

export async function createDocumentHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const apiUser = await requireApiKey(request)

    const body = await request.json()
    const result = await apiWrite(
      { id: apiUser.userId, email: '', name: '', role: apiUser.role },
      () => createDocument(body, apiUser.userId),
      [{ kind: 'document' }],
    )

    handleServiceError(result)

    return apiCreated(result.data)
  } catch (error) {
    return apiError(error)
  }
}

export async function updateDocumentHandler(request: NextRequest, id: number): Promise<NextResponse> {
  try {
    const apiUser = await requireApiKey(request)

    const body = await request.json()
    const result = await apiWrite(
      { id: apiUser.userId, email: '', name: '', role: apiUser.role },
      () => updateDocument(id, body, apiUser.userId),
      [{ kind: 'document', documentId: id }],
    )

    handleServiceError(result)

    return apiSuccess(result.data!)
  } catch (error) {
    return apiError(error)
  }
}

export async function deleteDocumentHandler(request: NextRequest, id: number): Promise<NextResponse> {
  try {
    const apiUser = await requireApiKey(request)

    const result = await apiWrite(
      { id: apiUser.userId, email: '', name: '', role: apiUser.role },
      () => deleteDocument(id, apiUser.userId),
      [{ kind: 'document', documentId: id }],
    )

    handleServiceError(result)

    return apiNoContent()
  } catch (error) {
    return apiError(error)
  }
}

export async function getDocumentLinesHandler(request: NextRequest, id: number): Promise<NextResponse> {
  try {
    await requireApiKey(request)

    const url = request.nextUrl
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)

    if (isNaN(id)) {
      throw new ValidationError('ID de document invalide')
    }

    const result = await getDocumentLinesById(id, page, limit)

    handleServiceError(result)

    return apiPaginated(result.data, result.meta)
  } catch (error) {
    return apiError(error)
  }
}
