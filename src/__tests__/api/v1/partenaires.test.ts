import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const {
  mockGetPartners,
  mockGetPartnerById,
  mockCreatePartner,
  mockUpdatePartner,
  mockDeletePartner,
  mockGetPartnerDocuments,
  mockRequireApiKey,
  mockRedisIncr,
} = vi.hoisted(() => ({
  mockGetPartners: vi.fn(),
  mockGetPartnerById: vi.fn(),
  mockCreatePartner: vi.fn(),
  mockUpdatePartner: vi.fn(),
  mockDeletePartner: vi.fn(),
  mockGetPartnerDocuments: vi.fn(),
  mockRequireApiKey: vi.fn(),
  mockRedisIncr: vi.fn(),
}))

vi.mock('@/lib/partners/partner-service', () => ({
  getPartners: mockGetPartners,
  getPartnerById: mockGetPartnerById,
  createPartner: mockCreatePartner,
  updatePartner: mockUpdatePartner,
  deletePartner: mockDeletePartner,
  getPartnerDocuments: mockGetPartnerDocuments,
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
  listPartnersHandler,
  getPartnerByIdHandler,
  createPartnerHandler,
  updatePartnerHandler,
  deletePartnerHandler,
  getPartnerDocumentsHandler,
} from '@/lib/api/handlers/partenaires'
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

function makePaginatedMeta(total: number, page: number = 1, limit: number = 50) {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasMore: page * limit < total,
  }
}

function makePartner(overrides: Record<string, unknown> = {}) {
  return {
    id_partenaire: 1,
    code_partenaire: 'P-001',
    nom_partenaire: 'Client Alpha',
    type_partenaire: 'CLIENT',
    adresse_email: 'alpha@test.com',
    numero_telephone: null,
    numero_fax: null,
    url_site_web: null,
    adresse_rue: null,
    code_postal: null,
    ville: 'Casablanca',
    pays: 'Maroc',
    numero_tva: null,
    numero_ice: null,
    numero_rc: null,
    delai_paiement_jours: 30,
    limite_credit: 10000,
    pourcentage_remise: 0,
    numero_compte_bancaire: null,
    code_banque: null,
    numero_iban: null,
    code_swift: null,
    est_actif: true,
    est_bloque: false,
    date_creation: new Date('2025-01-01'),
    date_modification: new Date('2025-06-01'),
    cree_par: null,
    modifie_par: null,
    compte_collectif: null,
    compte_auxiliaire: null,
    solde_courant: 0,
    plafond_credit: 10000,
    ...overrides,
  }
}

describe('Partenaire API Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRedisIncr.mockResolvedValue(1)
  })

  describe('GET list', () => {
    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Clé API invalide'))

      const request = makeRequest('GET', '/api/v1/partenaires')
      const response = await listPartnersHandler(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.code).toBe('AUTHENTICATION_ERROR')
    })

    it('should return paginated partners', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      const partner = makePartner()
      mockGetPartners.mockResolvedValue({ data: [partner], meta: makePaginatedMeta(1) })

      const request = makeRequest('GET', '/api/v1/partenaires')
      const response = await listPartnersHandler(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data).toHaveLength(1)
      expect(data.data[0].nom_partenaire).toBe('Client Alpha')
      expect(data.meta.total).toBe(1)
    })

    it('should filter by type', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockGetPartners.mockResolvedValue({ data: [], meta: makePaginatedMeta(0) })

      const request = makeRequest('GET', '/api/v1/partenaires?type=FOURNISSEUR')
      const response = await listPartnersHandler(request)

      expect(response.status).toBe(200)
      expect(mockGetPartners).toHaveBeenCalledWith('FOURNISSEUR', 1, 50, undefined, undefined, 'asc')
    })

    it('should search by nom_partenaire and code_partenaire', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockGetPartners.mockResolvedValue({ data: [], meta: makePaginatedMeta(0) })

      const request = makeRequest('GET', '/api/v1/partenaires?search=Alpha')
      const response = await listPartnersHandler(request)

      expect(response.status).toBe(200)
      expect(mockGetPartners).toHaveBeenCalledWith(undefined, 1, 50, 'Alpha', undefined, 'asc')
    })

    it('should sort by specified field', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockGetPartners.mockResolvedValue({ data: [], meta: makePaginatedMeta(0) })

      const request = makeRequest('GET', '/api/v1/partenaires?sort=ville&order=desc')
      const response = await listPartnersHandler(request)

      expect(response.status).toBe(200)
      expect(mockGetPartners).toHaveBeenCalledWith(undefined, 1, 50, undefined, 'ville', 'desc')
    })

    it('should pass through invalid sort for service to handle', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockGetPartners.mockResolvedValue({ data: [], meta: makePaginatedMeta(0) })

      const request = makeRequest('GET', '/api/v1/partenaires?sort=invalid_field')
      const response = await listPartnersHandler(request)

      expect(response.status).toBe(200)
      expect(mockGetPartners).toHaveBeenCalledWith(undefined, 1, 50, undefined, 'invalid_field', 'asc')
    })
  })

  describe('GET by id', () => {
    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Clé API invalide'))

      const request = makeRequest('GET', '/api/v1/partenaires/1')
      const response = await getPartnerByIdHandler(request, 1)

      expect(response.status).toBe(401)
    })

    it('should return partner by id', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      const partner = makePartner()
      mockGetPartnerById.mockResolvedValue({ data: partner })

      const request = makeRequest('GET', '/api/v1/partenaires/1')
      const response = await getPartnerByIdHandler(request, 1)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.nom_partenaire).toBe('Client Alpha')
    })

    it('should return 404 for non-existent partner', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockGetPartnerById.mockResolvedValue({ data: undefined, error: 'Partenaire introuvable' })

      const request = makeRequest('GET', '/api/v1/partenaires/999')
      const response = await getPartnerByIdHandler(request, 999)

      expect(response.status).toBe(404)
    })

    it('should return 400 for invalid id', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)

      const request = makeRequest('GET', '/api/v1/partenaires/abc')
      const response = await getPartnerByIdHandler(request, NaN)

      expect(response.status).toBe(400)
    })
  })

  describe('POST create', () => {
    const createBody = {
      code_partenaire: 'P-002',
      nom_partenaire: 'New Partner',
      type_partenaire: 'CLIENT' as const,
    }

    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Clé API invalide'))

      const request = makeRequest('POST', '/api/v1/partenaires', createBody)
      const response = await createPartnerHandler(request)

      expect(response.status).toBe(401)
    })

    it('should create a partner and return 201', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockCreatePartner.mockResolvedValue({
        data: makePartner({ code_partenaire: 'P-002', nom_partenaire: 'New Partner' }),
      })

      const request = makeRequest('POST', '/api/v1/partenaires', createBody)
      const response = await createPartnerHandler(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.nom_partenaire).toBe('New Partner')
      expect(mockCreatePartner).toHaveBeenCalledWith(
        expect.objectContaining({
          code_partenaire: 'P-002',
          nom_partenaire: 'New Partner',
        }),
        'user-api-1'
      )
    })

    it('should return 409 on duplicate code', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockCreatePartner.mockResolvedValue({
        error: 'Le partenaire P-001 existe déjà',
      })

      const request = makeRequest('POST', '/api/v1/partenaires', { ...createBody, code_partenaire: 'P-001' })
      const response = await createPartnerHandler(request)

      expect(response.status).toBe(409)
    })

    it('should return 400 for missing required fields', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockCreatePartner.mockResolvedValue({
        error: 'Validation échouée: requis',
      })

      const request = makeRequest('POST', '/api/v1/partenaires', { nom_partenaire: 'No Code' })
      const response = await createPartnerHandler(request)

      expect(response.status).toBe(400)
    })

    it('should return 400 for invalid email format', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockCreatePartner.mockResolvedValue({
        error: 'Validation échouée: adresse email invalide',
      })

      const request = makeRequest('POST', '/api/v1/partenaires', {
        ...createBody,
        adresse_email: 'not-an-email',
      })
      const response = await createPartnerHandler(request)

      expect(response.status).toBe(400)
    })
  })

  describe('PUT update', () => {
    const updateBody = { nom_partenaire: 'Updated Partner' }

    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Clé API invalide'))

      const request = makeRequest('PUT', '/api/v1/partenaires/1', updateBody)
      const response = await updatePartnerHandler(request, 1)

      expect(response.status).toBe(401)
    })

    it('should update a partner', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockUpdatePartner.mockResolvedValue({
        data: makePartner({ nom_partenaire: 'Updated Partner' }),
      })

      const request = makeRequest('PUT', '/api/v1/partenaires/1', updateBody)
      const response = await updatePartnerHandler(request, 1)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.nom_partenaire).toBe('Updated Partner')
      expect(mockUpdatePartner).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ nom_partenaire: 'Updated Partner' }),
        'user-api-1'
      )
    })

    it('should return 404 for non-existent partner', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockUpdatePartner.mockResolvedValue({ data: undefined, error: 'Partenaire introuvable' })

      const request = makeRequest('PUT', '/api/v1/partenaires/999', updateBody)
      const response = await updatePartnerHandler(request, 999)

      expect(response.status).toBe(404)
    })

    it('should return 409 on duplicate code change', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockUpdatePartner.mockResolvedValue({
        data: undefined,
        error: 'Le partenaire P-999 existe déjà',
      })

      const request = makeRequest('PUT', '/api/v1/partenaires/1', { code_partenaire: 'P-999' })
      const response = await updatePartnerHandler(request, 1)

      expect(response.status).toBe(409)
    })
  })

  describe('DELETE', () => {
    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Clé API invalide'))

      const request = makeRequest('DELETE', '/api/v1/partenaires/1')
      const response = await deletePartnerHandler(request, 1)

      expect(response.status).toBe(401)
    })

    it('should soft-delete a partner', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockDeletePartner.mockResolvedValue({ data: { success: true } })

      const request = makeRequest('DELETE', '/api/v1/partenaires/1')
      const response = await deletePartnerHandler(request, 1)

      expect(response.status).toBe(204)
    })

    it('should return 404 for non-existent partner', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockDeletePartner.mockResolvedValue({ data: undefined, error: 'Partenaire introuvable' })

      const request = makeRequest('DELETE', '/api/v1/partenaires/999')
      const response = await deletePartnerHandler(request, 999)

      expect(response.status).toBe(404)
    })
  })

  describe('GET documents', () => {
    it('should return partner documents', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockGetPartnerDocuments.mockResolvedValue({
        data: [{ id_document: 1, numero_document: 'FAC-001' }],
        meta: makePaginatedMeta(1),
      })

      const request = makeRequest('GET', '/api/v1/partenaires/1/documents')
      const response = await getPartnerDocumentsHandler(request, 1)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data).toHaveLength(1)
      expect(data.data[0].id_document).toBe(1)
    })

    it('should return 404 for non-existent partner', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockGetPartnerDocuments.mockResolvedValue({
        data: [],
        meta: makePaginatedMeta(0, 1, 50),
        error: 'Partenaire introuvable',
      })

      const request = makeRequest('GET', '/api/v1/partenaires/999/documents')
      const response = await getPartnerDocumentsHandler(request, 999)

      expect(response.status).toBe(404)
    })
  })
})

describe('Rate Limiting', () => {
  it('should return 429 when rate limit exceeded', async () => {
    mockRedisIncr.mockResolvedValue(31)
    mockRequireApiKey.mockResolvedValue({ userId: 'user-1', role: 'ADMIN' as const, keyId: 'key-1' })
    mockCreatePartner.mockResolvedValue({ data: makePartner() })

    const { POST } = await import('@/app/api/v1/partenaires/route')
    const request = makeRequest('POST', '/api/v1/partenaires', {
      code_partenaire: 'P-RATE',
      nom_partenaire: 'Rate Limit Test',
      type_partenaire: 'CLIENT',
    })

    const response = await POST(request)

    expect(response.status).toBe(429)
    const data = await response.json()
    expect(data.code).toBe('RATE_LIMIT_EXCEEDED')
  })
})
