'use server'

import { requirePermission } from '@/lib/auth/authorization'
import { getPartners as getPartnersList } from '@/lib/partners/partner-service'

export async function getPartners(type?: string, page: number = 1, limit: number = 50) {
  await requirePermission('partners:read')
  return getPartnersList(type, page, limit)
}
