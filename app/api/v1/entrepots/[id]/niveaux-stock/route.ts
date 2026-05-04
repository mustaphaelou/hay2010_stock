import { NextRequest } from 'next/server'
import { withRateLimit } from '@/lib/security/rate-limit'
import { getWarehouseStockLevelsHandler } from '@/lib/api/handlers/entrepots'

export const GET = withRateLimit(
  (request: NextRequest) => getWarehouseStockLevelsHandler(request),
  'read'
)
