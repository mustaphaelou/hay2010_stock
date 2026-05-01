import { NextRequest } from 'next/server'
import { withRateLimit } from '@/lib/api/middleware'
import {
  getWarehouseByIdHandler,
  updateWarehouseHandler,
  deleteWarehouseHandler,
} from '@/lib/api/handlers/entrepots'

export const GET = withRateLimit(
  (request: NextRequest) => getWarehouseByIdHandler(request),
  'read'
)

export const PUT = withRateLimit(
  (request: NextRequest) => updateWarehouseHandler(request),
  'write'
)

export const DELETE = withRateLimit(
  (request: NextRequest) => deleteWarehouseHandler(request),
  'write'
)
