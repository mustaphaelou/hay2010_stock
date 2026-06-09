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
  execute: ({ query, pagination }) => {
    const { page, limit, sort, order } = pagination
    const type = query.type || undefined
    const search = query.search || undefined
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
  execute: ({ id, pagination }) => {
    return getPartnerDocuments(id!, pagination.page, pagination.limit)
  },
  responseType: 'paginated'
})
