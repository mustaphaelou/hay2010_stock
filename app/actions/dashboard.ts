'use server'

import { requireAuth } from '@/lib/auth/user-utils'
import { getDashboardStats as getStats } from '@/lib/dashboard/dashboard-service'

export async function getDashboardStats() {
  await requireAuth()
  return getStats()
}
