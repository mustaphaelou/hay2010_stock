import { apiHandler } from '@/lib/api/handler'
import {
  listDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  deleteDocument,
  getDocumentLinesById,
} from '@/lib/documents/document-service'

export const listDocumentsHandler = apiHandler({
  rateLimit: 'read',
  execute: ({ query, user }) => {
    const page = parseInt(query.page || '1', 10)
    const limit = parseInt(query.limit || '50', 10)

    const params = {
      page,
      limit,
      search: query.search || undefined,
      type_document: query.type_document || undefined,
      domaine: query.domaine_document || undefined,
      statut_document: query.statut_document || undefined,
      id_partenaire: query.id_partenaire ? parseInt(query.id_partenaire, 10) : undefined,
      id_affaire: query.id_affaire ? parseInt(query.id_affaire, 10) : undefined,
      sort: query.sort || undefined,
      order: query.order === 'asc' ? ('asc' as const) : undefined,
    }

    const userParam = { id: user!.userId, role: user!.role }
    return listDocuments(params, userParam)
  },
  responseType: 'paginated'
})

export const getDocumentByIdHandler = apiHandler({
  rateLimit: 'read',
  idParam: true,
  idErrorMessage: 'ID de document invalide',
  execute: ({ id }) => getDocumentById(id!)
})

export const createDocumentHandler = apiHandler({
  rateLimit: 'write',
  type: 'write',
  invalidations: [{ kind: 'document' }],
  responseType: 'created',
  execute: ({ body, user }) => createDocument(body, user!.userId)
})

export const updateDocumentHandler = apiHandler({
  rateLimit: 'write',
  idParam: true,
  idErrorMessage: 'ID de document invalide',
  type: 'write',
  invalidations: (id) => [{ kind: 'document', documentId: id }],
  execute: ({ id, body, user }) => updateDocument(id!, body, user!.userId)
})

export const deleteDocumentHandler = apiHandler({
  rateLimit: 'write',
  idParam: true,
  idErrorMessage: 'ID de document invalide',
  type: 'write',
  invalidations: (id) => [{ kind: 'document', documentId: id }],
  responseType: 'noContent',
  execute: ({ id, user }) => deleteDocument(id!, user!.userId)
})

export const getDocumentLinesHandler = apiHandler({
  rateLimit: 'read',
  idParam: true,
  idErrorMessage: 'ID de document invalide',
  execute: ({ id, query }) => {
    const page = parseInt(query.page || '1', 10)
    const limit = parseInt(query.limit || '50', 10)
    return getDocumentLinesById(id!, page, limit)
  },
  responseType: 'paginated'
})
