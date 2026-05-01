import { NextRequest } from 'next/server'
import { withRateLimit } from '@/lib/api/middleware'
import { listWarehousesHandler, createWarehouseHandler } from '@/lib/api/handlers/entrepots'

export const GET = withRateLimit(
  (request: NextRequest) => listWarehousesHandler(request),
  'read'
)

export const POST = withRateLimit(
  (request: NextRequest) => createWarehouseHandler(request),
  'write'
)
