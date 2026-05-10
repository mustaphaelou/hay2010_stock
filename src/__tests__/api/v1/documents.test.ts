import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const {
  mockListDocuments,
  mockGetDocumentById,
  mockCreateDocument,
  mockUpdateDocument,
  mockDeleteDocument,
  mockGetDocumentLinesById,
  mockRequireApiKey,
  mockRedisIncr,
} = vi.hoisted(() => ({
  mockListDocuments: vi.fn(),
  mockGetDocumentById: vi.fn(),
  mockCreateDocument: vi.fn(),
  mockUpdateDocument: vi.fn(),
  mockDeleteDocument: vi.fn(),
  mockGetDocumentLinesById: vi.fn(),
  mockRequireApiKey: vi.fn(),
  mockRedisIncr: vi.fn(),
}))

vi.mock('@/lib/documents/document-service', () => ({
  listDocuments: mockListDocuments,
  getDocumentById: mockGetDocumentById,
  createDocument: mockCreateDocument,
  updateDocument: mockUpdateDocument,
  deleteDocument: mockDeleteDocument,
  getDocumentLinesById: mockGetDocumentLinesById,
}))

vi.mock('@/lib/api/service-error', async () => {
  const errors = await vi.importActual<typeof import('@/lib/errors')>('@/lib/errors')
  return {
    handleServiceError: (result: { error?: string }) => {
      if (!result.error) return
      if (result.error.includes('introuvable')) throw new errors.NotFoundError(result.error)
      if (result.error.includes('existe déjà')) throw new errors.ConflictError(result.error)
      if (result.error.includes('invalide') || result.error.includes('requis')) throw new errors.ValidationError(result.error)
      throw new errors.BusinessError(result.error)
    },
  }
})

vi.mock('@/lib/db/redis', async () => {
  const actual = await vi.importActual('@/lib/db/redis')
  return {
    ...actual,
    redis: {
      ...(actual as Record<string, { redis?: Record<string, unknown> }>).redis,
      incr: mockRedisIncr,
      expire: vi.fn().mockResolvedValue('OK'),
    },
  }
})

vi.mock('@/lib/api/auth', () => ({
  requireApiKey: mockRequireApiKey,
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

import {
  listDocumentsHandler,
  getDocumentByIdHandler,
  createDocumentHandler,
  updateDocumentHandler,
  deleteDocumentHandler,
  getDocumentLinesHandler,
} from '@/lib/api/handlers/documents'
import { AuthenticationError } from '@/lib/errors'

const API_USER = { userId: 'user-api-1', role: 'ADMIN' as const, keyId: 'key-1' }

function makeRequest(method: string, path: string, body?: unknown): NextRequest {
  const url = new URL(path, 'http://localhost')
  const headers = new Headers()
  if (body) {
    headers.set('content-type', 'application/json')
  }
  const req = new NextRequest(url, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  return req
}

const mockDocument = {
  id_document: 1,
  numero_document: 'FAC-001',
  type_document: 'Facture',
  domaine_document: 'VENTE',
  date_document: new Date('2025-01-01'),
  montant_ht: 1000.00,
  montant_ttc: 1200.00,
  solde_du: 0,
}

describe('Document API Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRedisIncr.mockResolvedValue(1)
    mockRequireApiKey.mockResolvedValue(API_USER)
  })

  describe('GET list', () => {
    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Clé API invalide'))

      const request = makeRequest('GET', '/api/v1/documents')
      const response = await listDocumentsHandler(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.code).toBe('AUTHENTICATION_ERROR')
    })

    it('should return paginated documents', async () => {
      mockListDocuments.mockResolvedValue({
        data: [mockDocument],
        meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
      })

      const request = makeRequest('GET', '/api/v1/documents')
      const response = await listDocumentsHandler(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data).toHaveLength(1)
    })

    it('should pass filter params to service', async () => {
      mockListDocuments.mockResolvedValue({
        data: [mockDocument],
        meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
      })

      const request = makeRequest('GET', '/api/v1/documents?type_document=BL')
      const response = await listDocumentsHandler(request)

      expect(response.status).toBe(200)
      expect(mockListDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ type_document: 'BL' }),
        expect.any(Object)
      )
    })

    it('should handle service error', async () => {
      mockListDocuments.mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 50, total: 0, totalPages: 0 },
        error: 'Échec de la récupération des documents',
      })

      const request = makeRequest('GET', '/api/v1/documents')
      const response = await listDocumentsHandler(request)

      expect(response.status).toBe(422)
    })
  })

  describe('GET by id', () => {
    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Clé API invalide'))

      const request = makeRequest('GET', '/api/v1/documents/1')
      const response = await getDocumentByIdHandler(request, 1)

      expect(response.status).toBe(401)
    })

    it('should return document by id', async () => {
      mockGetDocumentById.mockResolvedValue({ data: mockDocument })

      const request = makeRequest('GET', '/api/v1/documents/1')
      const response = await getDocumentByIdHandler(request, 1)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.numero_document).toBe('FAC-001')
    })

    it('should return 404 for non-existent document', async () => {
      mockGetDocumentById.mockResolvedValue({ data: null, error: 'Document introuvable' })

      const request = makeRequest('GET', '/api/v1/documents/999')
      const response = await getDocumentByIdHandler(request, 999)

      expect(response.status).toBe(404)
    })
  })

  describe('POST create', () => {
    const createBody = {
      numero_document: 'FAC-002',
      type_document: 'Facture',
      domaine_document: 'VENTE',
      id_partenaire: 1,
      date_document: '2025-03-01',
      code_devise: 'MAD',
      montant_ht: 500.00,
    }

    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Clé API invalide'))

      const request = makeRequest('POST', '/api/v1/documents', createBody)
      const response = await createDocumentHandler(request)

      expect(response.status).toBe(401)
    })

    it('should create a document and return 201', async () => {
      mockCreateDocument.mockResolvedValue({ data: { ...mockDocument, numero_document: 'FAC-002' } })

      const request = makeRequest('POST', '/api/v1/documents', createBody)
      const response = await createDocumentHandler(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.numero_document).toBe('FAC-002')
    })

    it('should return 409 on duplicate numero_document', async () => {
      mockCreateDocument.mockResolvedValue({ error: 'Le document FAC-001 existe déjà' })

      const request = makeRequest('POST', '/api/v1/documents', { ...createBody, numero_document: 'FAC-001' })
      const response = await createDocumentHandler(request)

      expect(response.status).toBe(409)
    })

    it('should return 404 when id_partenaire introuvable', async () => {
      mockCreateDocument.mockResolvedValue({ error: 'Partenaire introuvable' })

      const request = makeRequest('POST', '/api/v1/documents', { ...createBody, id_partenaire: 999 })
      const response = await createDocumentHandler(request)

      expect(response.status).toBe(404)
    })

    it('should return 400 for validation errors', async () => {
      mockCreateDocument.mockResolvedValue({ error: 'Validation échouée: requis' })

      const request = makeRequest('POST', '/api/v1/documents', { numero_document: 'No Date' })
      const response = await createDocumentHandler(request)

      expect(response.status).toBe(400)
    })
  })

  describe('PUT update', () => {
    const updateBody = { numero_document: 'FAC-001-UPD', montant_ht: 1500.00 }

    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Clé API invalide'))

      const request = makeRequest('PUT', '/api/v1/documents/1', updateBody)
      const response = await updateDocumentHandler(request, 1)

      expect(response.status).toBe(401)
    })

    it('should update a document', async () => {
      mockUpdateDocument.mockResolvedValue({ data: { ...mockDocument, numero_document: 'FAC-001-UPD' } })

      const request = makeRequest('PUT', '/api/v1/documents/1', updateBody)
      const response = await updateDocumentHandler(request, 1)

      expect(response.status).toBe(200)
    })

    it('should return 404 for non-existent document', async () => {
      mockUpdateDocument.mockResolvedValue({ error: 'Document introuvable' })

      const request = makeRequest('PUT', '/api/v1/documents/999', updateBody)
      const response = await updateDocumentHandler(request, 999)

      expect(response.status).toBe(404)
    })

    it('should return 409 on duplicate numero_document', async () => {
      mockUpdateDocument.mockResolvedValue({ error: 'Le document FAC-999 existe déjà' })

      const request = makeRequest('PUT', '/api/v1/documents/1', { numero_document: 'FAC-999' })
      const response = await updateDocumentHandler(request, 1)

      expect(response.status).toBe(409)
    })
  })

  describe('DELETE', () => {
    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Clé API invalide'))

      const request = makeRequest('DELETE', '/api/v1/documents/1')
      const response = await deleteDocumentHandler(request, 1)

      expect(response.status).toBe(401)
    })

    it('should soft-delete a document', async () => {
      mockDeleteDocument.mockResolvedValue({ data: { success: true } })

      const request = makeRequest('DELETE', '/api/v1/documents/1')
      const response = await deleteDocumentHandler(request, 1)

      expect(response.status).toBe(204)
    })

    it('should return 404 for non-existent document', async () => {
      mockDeleteDocument.mockResolvedValue({ error: 'Document introuvable' })

      const request = makeRequest('DELETE', '/api/v1/documents/999')
      const response = await deleteDocumentHandler(request, 999)

      expect(response.status).toBe(404)
    })
  })

  describe('GET lines', () => {
    it('should return document lines', async () => {
      mockGetDocumentLinesById.mockResolvedValue({
        data: [{ id_ligne: 1, id_document: 1 }],
        meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
      })

      const request = makeRequest('GET', '/api/v1/documents/1/lines')
      const response = await getDocumentLinesHandler(request, 1)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data).toHaveLength(1)
    })

    it('should return 404 for non-existent document', async () => {
      mockGetDocumentLinesById.mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 50, total: 0, totalPages: 0 },
        error: 'Document introuvable',
      })

      const request = makeRequest('GET', '/api/v1/documents/999/lines')
      const response = await getDocumentLinesHandler(request, 999)

      expect(response.status).toBe(404)
    })
  })
})

describe('Rate Limiting', () => {
  it('should return 429 when rate limit exceeded', async () => {
    mockRedisIncr.mockResolvedValue(31)
    mockRequireApiKey.mockResolvedValue({ userId: 'user-1', role: 'ADMIN' as const, keyId: 'key-1' })
    mockCreateDocument.mockResolvedValue({ data: mockDocument })

    const { POST } = await import('@/app/api/v1/documents/route')
    const request = makeRequest('POST', '/api/v1/documents', {
      numero_document: 'FAC-RATE',
      type_document: 'Facture',
      domaine_document: 'VENTE',
      id_partenaire: 1,
      date_document: '2025-01-01',
      code_devise: 'MAD',
      montant_ht: 100,
    })

    const response = await POST(request)

    expect(response.status).toBe(429)
    const data = await response.json()
    expect(data.code).toBe('RATE_LIMIT_EXCEEDED')
  })
})
