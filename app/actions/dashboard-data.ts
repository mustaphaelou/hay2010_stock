'use server'

import { requireAuth } from '@/lib/auth/user-utils'
import { getDashboardData as getData } from '@/lib/dashboard/dashboard-service'

export type { DashboardProductData, DashboardPartnerData, DashboardDocumentData, DashboardMovementData, DashboardDataResult } from '@/lib/dashboard/dashboard-service'

export async function getDashboardData() {
  await requireAuth()
  return getData()
}
