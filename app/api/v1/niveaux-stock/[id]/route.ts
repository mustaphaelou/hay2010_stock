import { NextRequest } from 'next/server'
import { withRateLimit } from '@/lib/security/rate-limit'
import {
  getStockLevelByIdHandler,
  adjustStockLevelHandler,
  deleteStockLevelHandler,
} from '@/lib/api/handlers/niveaux-stock'

export const GET = withRateLimit(
  (request: NextRequest) => getStockLevelByIdHandler(request),
  'read'
)

export const PUT = withRateLimit(
  (request: NextRequest) => adjustStockLevelHandler(request),
  'write'
)

export const DELETE = withRateLimit(
  (request: NextRequest) => deleteStockLevelHandler(request),
  'write'
)
