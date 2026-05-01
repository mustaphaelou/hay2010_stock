import { NextRequest } from 'next/server'
import { withRateLimit } from '@/lib/api/middleware'
import { listStockLevelsHandler, createStockLevelHandler } from '@/lib/api/handlers/niveaux-stock'

export const GET = withRateLimit(
  (request: NextRequest) => listStockLevelsHandler(request),
  'read'
)

export const POST = withRateLimit(
  (request: NextRequest) => createStockLevelHandler(request),
  'write'
)
