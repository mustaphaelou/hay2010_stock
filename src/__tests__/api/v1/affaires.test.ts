import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const {
  mockGetAffaires,
  mockGetAffaireById,
  mockCreateAffaire,
  mockUpdateAffaire,
  mockDeleteAffaire,
  mockGetAffaireDocumentsById,
  mockRequireApiKey,
  mockRedisIncr,
} = vi.hoisted(() => ({
  mockGetAffaires: vi.fn(),
  mockGetAffaireById: vi.fn(),
  mockCreateAffaire: vi.fn(),
  mockUpdateAffaire: vi.fn(),
  mockDeleteAffaire: vi.fn(),
  mockGetAffaireDocumentsById: vi.fn(),
  mockRequireApiKey: vi.fn(),
  mockRedisIncr: vi.fn(),
}))

vi.mock('@/lib/affaires/affaire-service', () => ({
  getAffaires: mockGetAffaires,
  getAffaireById: mockGetAffaireById,
  createAffaire: mockCreateAffaire,
  updateAffaire: mockUpdateAffaire,
  deleteAffaire: mockDeleteAffaire,
  getAffaireDocumentsById: mockGetAffaireDocumentsById,
}))

vi.mock('next/server', async (importOriginal) => {
  const mod = await importOriginal<typeof import('next/server')>()
  return { ...mod, after: vi.fn((fn: () => void | Promise<void>) => fn()) }
})

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
  listAffairesHandler,
  getAffaireByIdHandler,
  createAffaireHandler,
  updateAffaireHandler,
  deleteAffaireHandler,
  getAffaireDocumentsHandler,
} from '@/lib/api/handlers/affaires'
import { AuthenticationError, NotFoundError, ConflictError, ValidationError, BusinessError } from '@/lib/errors'

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

const mockAffaire = {
  id_affaire: 1,
  code_affaire: 'AFF-001',
  intitule_affaire: 'Affaire Test',
  type_affaire: 'Proposition',
  statut_affaire: 'En cours',
  est_actif: true,
}

describe('Affaire API Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRedisIncr.mockResolvedValue(1)
  })

  describe('GET list', () => {
    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Clé API invalide'))

      const request = makeRequest('GET', '/api/v1/affaires')
      const response = await listAffairesHandler(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.code).toBe('AUTHENTICATION_ERROR')
    })

    it('should return paginated affaires', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockGetAffaires.mockResolvedValue({
        data: [mockAffaire],
        meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
      })

      const request = makeRequest('GET', '/api/v1/affaires')
      const response = await listAffairesHandler(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data).toHaveLength(1)
    })

    it('should handle service error', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockGetAffaires.mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 50, total: 0, totalPages: 0 },
        error: 'Échec de la récupération des affaires',
      })

      const request = makeRequest('GET', '/api/v1/affaires')
      const response = await listAffairesHandler(request)

      expect(response.status).toBe(422)
    })
  })

  describe('GET by id', () => {
    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Clé API invalide'))

      const request = makeRequest('GET', '/api/v1/affaires/1')
      const response = await getAffaireByIdHandler(request, 1)

      expect(response.status).toBe(401)
    })

    it('should return affaire by id', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockGetAffaireById.mockResolvedValue({ data: mockAffaire })

      const request = makeRequest('GET', '/api/v1/affaires/1')
      const response = await getAffaireByIdHandler(request, 1)

      expect(response.status).toBe(200)
    })

    it('should return 404 for non-existent affaire', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockGetAffaireById.mockResolvedValue({ data: null, error: 'Affaire introuvable' })

      const request = makeRequest('GET', '/api/v1/affaires/999')
      const response = await getAffaireByIdHandler(request, 999)

      expect(response.status).toBe(404)
    })

    it('should return 400 for invalid id', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)

      const request = makeRequest('GET', '/api/v1/affaires/abc')
      const response = await getAffaireByIdHandler(request, NaN)

      expect(response.status).toBe(400)
    })
  })

  describe('POST create', () => {
    const createBody = {
      code_affaire: 'AFF-002',
      intitule_affaire: 'New Affaire',
      type_affaire: 'Proposition',
      statut_affaire: 'En cours',
    }

    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Clé API invalide'))

      const request = makeRequest('POST', '/api/v1/affaires', createBody)
      const response = await createAffaireHandler(request)

      expect(response.status).toBe(401)
    })

    it('should create an affaire and return 201', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockCreateAffaire.mockResolvedValue({ data: { ...mockAffaire, code_affaire: 'AFF-002' } })

      const request = makeRequest('POST', '/api/v1/affaires', createBody)
      const response = await createAffaireHandler(request)

      expect(response.status).toBe(201)
    })

    it('should return 409 on duplicate code', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockCreateAffaire.mockResolvedValue({ error: "L'affaire AFF-001 existe déjà" })

      const request = makeRequest('POST', '/api/v1/affaires', { ...createBody, code_affaire: 'AFF-001' })
      const response = await createAffaireHandler(request)

      expect(response.status).toBe(409)
    })

    it('should return 400 for validation errors', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockCreateAffaire.mockResolvedValue({ error: 'Validation échouée: requis' })

      const request = makeRequest('POST', '/api/v1/affaires', { intitule_affaire: 'No Code' })
      const response = await createAffaireHandler(request)

      expect(response.status).toBe(400)
    })
  })

  describe('PUT update', () => {
    const updateBody = { intitule_affaire: 'Updated Affaire' }

    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Clé API invalide'))

      const request = makeRequest('PUT', '/api/v1/affaires/1', updateBody)
      const response = await updateAffaireHandler(request, 1)

      expect(response.status).toBe(401)
    })

    it('should update an affaire', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockUpdateAffaire.mockResolvedValue({ data: { ...mockAffaire, intitule_affaire: 'Updated Affaire' } })

      const request = makeRequest('PUT', '/api/v1/affaires/1', updateBody)
      const response = await updateAffaireHandler(request, 1)

      expect(response.status).toBe(200)
    })

    it('should return 404 for non-existent affaire', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockUpdateAffaire.mockResolvedValue({ error: 'Affaire introuvable' })

      const request = makeRequest('PUT', '/api/v1/affaires/999', updateBody)
      const response = await updateAffaireHandler(request, 999)

      expect(response.status).toBe(404)
    })

    it('should return 409 on duplicate code', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockUpdateAffaire.mockResolvedValue({ error: "L'affaire AFF-999 existe déjà" })

      const request = makeRequest('PUT', '/api/v1/affaires/1', { code_affaire: 'AFF-999' })
      const response = await updateAffaireHandler(request, 1)

      expect(response.status).toBe(409)
    })
  })

  describe('DELETE', () => {
    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Clé API invalide'))

      const request = makeRequest('DELETE', '/api/v1/affaires/1')
      const response = await deleteAffaireHandler(request, 1)

      expect(response.status).toBe(401)
    })

    it('should soft-delete an affaire', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockDeleteAffaire.mockResolvedValue({ data: { success: true } })

      const request = makeRequest('DELETE', '/api/v1/affaires/1')
      const response = await deleteAffaireHandler(request, 1)

      expect(response.status).toBe(204)
    })

    it('should return 404 for non-existent affaire', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockDeleteAffaire.mockResolvedValue({ error: 'Affaire introuvable' })

      const request = makeRequest('DELETE', '/api/v1/affaires/999')
      const response = await deleteAffaireHandler(request, 999)

      expect(response.status).toBe(404)
    })
  })

  describe('GET documents', () => {
    it('should return affaire documents', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockGetAffaireDocumentsById.mockResolvedValue({
        data: [{ id_document: 1, numero_document: 'FAC-001' }],
        meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
      })

      const request = makeRequest('GET', '/api/v1/affaires/1/documents')
      const response = await getAffaireDocumentsHandler(request, 1)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data).toHaveLength(1)
    })

    it('should return 404 for non-existent affaire', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockGetAffaireDocumentsById.mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 50, total: 0, totalPages: 0 },
        error: 'Affaire introuvable',
      })

      const request = makeRequest('GET', '/api/v1/affaires/999/documents')
      const response = await getAffaireDocumentsHandler(request, 999)

      expect(response.status).toBe(404)
    })
  })
})

describe('Rate Limiting', () => {
  it('should return 429 when rate limit exceeded', async () => {
    mockRedisIncr.mockResolvedValue(31)
    mockRequireApiKey.mockResolvedValue({ userId: 'user-1', role: 'ADMIN' as const, keyId: 'key-1' })
    mockCreateAffaire.mockResolvedValue({ data: mockAffaire })

    const { POST } = await import('@/app/api/v1/affaires/route')
    const request = makeRequest('POST', '/api/v1/affaires', {
      code_affaire: 'AFF-RATE',
      intitule_affaire: 'Rate Limit Test',
      type_affaire: 'Proposition',
      statut_affaire: 'En cours',
    })

    const response = await POST(request)

    expect(response.status).toBe(429)
    const data = await response.json()
    expect(data.code).toBe('RATE_LIMIT_EXCEEDED')
  })
})
