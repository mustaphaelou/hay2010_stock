'use server'

import { requirePermission } from '@/lib/auth/authorization'
import { getStockLevels as getLevels, getDepots as getDepotsList } from '@/lib/stock/stock-service'

export async function getStockLevels(page: number = 1, limit: number = 50) {
  await requirePermission('stock:read')
  return getLevels(page, limit)
}

export async function getDepots() {
  await requirePermission('stock:read')
  return getDepotsList()
}
