import { apiHandler } from '@/lib/api/handler'
import {
  getAffaires,
  getAffaireById,
  createAffaire,
  updateAffaire,
  deleteAffaire,
  getAffaireDocumentsById,
} from '@/lib/affaires/affaire-service'
import type { GetAffairesInput } from '@/lib/affaires/validation'

export const listAffairesHandler = apiHandler({
  rateLimit: 'read',
  execute: ({ query }) => {
    const page = parseInt(query.page || '1', 10)
    const limit = parseInt(query.limit || '50', 10)

    const filters: Partial<GetAffairesInput> = {}
    const type = query.type || undefined
    const statut = query.statut || undefined
    const client = query.client || undefined
    const search = query.search || undefined

    if (type) filters.type_affaire = type
    if (statut) filters.statut_affaire = statut
    if (search) filters.search = search
    if (client) (filters as Record<string, unknown>).id_client = parseInt(client, 10) || undefined

    const sort = query.sort || undefined
    const order = (query.order || 'desc').toLowerCase() === 'asc' ? 'asc' as const : 'desc' as const

    return getAffaires(page, limit, filters, sort, order)
  },
  responseType: 'paginated'
})

export const getAffaireByIdHandler = apiHandler({
  rateLimit: 'read',
  idParam: true,
  idErrorMessage: 'ID d\'affaire invalide',
  execute: ({ id }) => getAffaireById(id!)
})

export const createAffaireHandler = apiHandler({
  rateLimit: 'write',
  type: 'write',
  invalidations: [{ kind: 'affaire' }],
  responseType: 'created',
  execute: ({ body, user }) => createAffaire(body, user!.userId)
})

export const updateAffaireHandler = apiHandler({
  rateLimit: 'write',
  idParam: true,
  idErrorMessage: 'ID d\'affaire invalide',
  type: 'write',
  invalidations: (id) => [{ kind: 'affaire', affaireId: id }],
  execute: ({ id, body, user }) => updateAffaire(id!, body, user!.userId)
})

export const deleteAffaireHandler = apiHandler({
  rateLimit: 'write',
  idParam: true,
  idErrorMessage: 'ID d\'affaire invalide',
  type: 'write',
  invalidations: (id) => [{ kind: 'affaire', affaireId: id }],
  responseType: 'noContent',
  execute: ({ id, user }) => deleteAffaire(id!, user!.userId)
})

export const getAffaireDocumentsHandler = apiHandler({
  rateLimit: 'read',
  idParam: true,
  idErrorMessage: 'ID d\'affaire invalide',
  execute: ({ id, query }) => {
    const page = parseInt(query.page || '1', 10)
    const limit = parseInt(query.limit || '50', 10)
    return getAffaireDocumentsById(id!, page, limit)
  },
  responseType: 'paginated'
})
