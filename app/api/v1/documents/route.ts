import { NextRequest } from 'next/server'
import { withRateLimit } from '@/lib/security/rate-limit'
import { listDocumentsHandler, createDocumentHandler } from '@/lib/api/handlers/documents'

export const GET = withRateLimit(
  (request: NextRequest) => listDocumentsHandler(request),
  'read'
)

export const POST = withRateLimit(
  (request: NextRequest) => createDocumentHandler(request),
  'write'
)
