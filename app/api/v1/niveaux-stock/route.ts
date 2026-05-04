import { NextRequest } from 'next/server'
import { withRateLimit } from '@/lib/security/rate-limit'
import { listStockLevelsHandler, createStockLevelHandler } from '@/lib/api/handlers/niveaux-stock'

export const GET = withRateLimit(
  (request: NextRequest) => listStockLevelsHandler(request),
  'read'
)

export const POST = withRateLimit(
  (request: NextRequest) => createStockLevelHandler(request),
  'write'
)
