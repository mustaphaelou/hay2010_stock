import { apiHandler } from '@/lib/api/handler'
import {
  getPartnerById,
  deletePartner,
  createPartner,
  updatePartner,
  getPartners,
  getPartnerDocuments,
} from '@/lib/partners/partner-service'

export const listPartnersHandler = apiHandler({
  rateLimit: 'read',
  execute: ({ query }) => {
    const page = parseInt(query.page || '1', 10)
    const limit = parseInt(query.limit || '50', 10)
    const type = query.type || undefined
    const search = query.search || undefined
    const sort = query.sort || undefined
    const order = (query.order || 'asc').toLowerCase() === 'desc' ? 'desc' as const : 'asc' as const
    return getPartners(type, page, limit, search, sort, order)
  },
  responseType: 'paginated'
})

export const getPartnerByIdHandler = apiHandler({
  rateLimit: 'read',
  idParam: true,
  idErrorMessage: 'ID partenaire invalide',
  execute: ({ id }) => getPartnerById(id!)
})

export const createPartnerHandler = apiHandler({
  rateLimit: 'write',
  type: 'write',
  invalidations: [{ kind: 'partner' }],
  responseType: 'created',
  execute: ({ body, user }) => createPartner(body, user!.userId)
})

export const updatePartnerHandler = apiHandler({
  rateLimit: 'write',
  idParam: true,
  idErrorMessage: 'ID partenaire invalide',
  type: 'write',
  invalidations: (id) => [{ kind: 'partner', partnerId: id }],
  execute: ({ id, body, user }) => updatePartner(id!, body, user!.userId)
})

export const deletePartnerHandler = apiHandler({
  rateLimit: 'write',
  idParam: true,
  idErrorMessage: 'ID partenaire invalide',
  type: 'write',
  invalidations: (id) => [{ kind: 'partner', partnerId: id }],
  responseType: 'noContent',
  execute: ({ id, user }) => deletePartner(id!, user!.userId)
})

export const getPartnerDocumentsHandler = apiHandler({
  rateLimit: 'read',
  idParam: true,
  idErrorMessage: 'ID partenaire invalide',
  execute: ({ id, query }) => {
    const page = parseInt(query.page || '1', 10)
    const limit = parseInt(query.limit || '50', 10)
    return getPartnerDocuments(id!, page, limit)
  },
  responseType: 'paginated'
})
