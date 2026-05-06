'use server'

import { requirePermission } from '@/lib/auth/authorization'
import { getPartners as getPartnersList, createPartner as createPartnerService, updatePartner as updatePartnerService, deletePartner as deletePartnerService } from '@/lib/partners/partner-service'
import { executeWrite } from '@/lib/actions/execute-write'
import type { CreatePartnerInput, UpdatePartnerInput } from '@/lib/partners/validation'

export async function getPartners(type?: string, page: number = 1, limit: number = 50) {
  await requirePermission('partners:read')
  return getPartnersList(type, page, limit)
}

export async function createPartner(input: CreatePartnerInput, csrfToken: string) {
  return executeWrite({
    permission: 'partners:write',
    csrfToken,
    writeFn: (user) => createPartnerService(input, user.id),
    invalidations: [{ kind: 'partner', partnerId: 0 }],
    revalidatePaths: ['/partners'],
  })
}

export async function updatePartner(id_partenaire: number, input: UpdatePartnerInput, csrfToken: string) {
  return executeWrite({
    permission: 'partners:write',
    csrfToken,
    writeFn: (user) => updatePartnerService(id_partenaire, input, user.id),
    invalidations: [{ kind: 'partner', partnerId: id_partenaire }],
    revalidatePaths: ['/partners'],
  })
}

export async function deletePartner(id_partenaire: number, csrfToken: string) {
  return executeWrite({
    permission: 'partners:delete',
    csrfToken,
    writeFn: () => deletePartnerService(id_partenaire),
    invalidations: [{ kind: 'partner', partnerId: id_partenaire }],
    revalidatePaths: ['/partners'],
  })
}
