import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockPartenaireFindMany, mockPartenaireCount, mockPartenaireFindUnique, mockPartenaireCreate, mockPartenaireUpdate, mockDocVenteFindMany, mockDocVenteCount, mockRequireApiKey, mockGetApiUser, mockCacheIncrement } = vi.hoisted(() => ({
  mockPartenaireFindMany: vi.fn(),
  mockPartenaireCount: vi.fn(),
  mockPartenaireFindUnique: vi.fn(),
  mockPartenaireCreate: vi.fn(),
  mockPartenaireUpdate: vi.fn(),
  mockDocVenteFindMany: vi.fn(),
  mockDocVenteCount: vi.fn(),
  mockRequireApiKey: vi.fn(),
  mockGetApiUser: vi.fn(),
  mockCacheIncrement: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    partenaire: {
      findMany: mockPartenaireFindMany,
      count: mockPartenaireCount,
      findUnique: mockPartenaireFindUnique,
      create: mockPartenaireCreate,
      update: mockPartenaireUpdate,
    },
    docVente: {
      findMany: mockDocVenteFindMany,
      count: mockDocVenteCount,
    },
  },
}))

vi.mock('@/lib/db/redis', async () => {
  const actual = await vi.importActual('@/lib/db/redis')
  return {
    ...actual,
    CacheService: {
      increment: mockCacheIncrement,
    },
  }
})

vi.mock('@/lib/api/auth', () => ({
  requireApiKey: mockRequireApiKey,
  getApiUser: mockGetApiUser,
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

const mockPartner = {
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
}

describe('Partenaire API Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCacheIncrement.mockResolvedValue(1)
  })

  describe('GET list', () => {
    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Invalid or missing API key'))

      const request = makeRequest('GET', '/api/v1/partenaires')
      const response = await listPartnersHandler(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.code).toBe('AUTHENTICATION_ERROR')
    })

    it('should return paginated partners', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockPartenaireFindMany.mockResolvedValue([mockPartner])
      mockPartenaireCount.mockResolvedValue(1)

      const request = makeRequest('GET', '/api/v1/partenaires')
      const response = await listPartnersHandler(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data).toHaveLength(1)
      expect(data.data[0].nom_partenaire).toBe('Client Alpha')
      expect(data.meta.total).toBe(1)
      expect(data.meta.page).toBe(1)
    })

    it('should filter by type', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockPartenaireFindMany.mockResolvedValue([{ ...mockPartner, type_partenaire: 'FOURNISSEUR' }])
      mockPartenaireCount.mockResolvedValue(1)

      const request = makeRequest('GET', '/api/v1/partenaires?type=FOURNISSEUR')
      const response = await listPartnersHandler(request)

      expect(response.status).toBe(200)
      expect(mockPartenaireFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { type_partenaire: 'FOURNISSEUR' } })
      )
    })

    it('should reject invalid type', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)

      const request = makeRequest('GET', '/api/v1/partenaires?type=INVALID')
      const response = await listPartnersHandler(request)

      expect(response.status).toBe(400)
    })

    it('should search by nom_partenaire and code_partenaire', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockPartenaireFindMany.mockResolvedValue([mockPartner])
      mockPartenaireCount.mockResolvedValue(1)

      const request = makeRequest('GET', '/api/v1/partenaires?search=Alpha')
      const response = await listPartnersHandler(request)

      expect(response.status).toBe(200)
      expect(mockPartenaireFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { nom_partenaire: { contains: 'Alpha', mode: 'insensitive' } },
              { code_partenaire: { contains: 'Alpha', mode: 'insensitive' } },
              { ville: { contains: 'Alpha', mode: 'insensitive' } },
            ]),
          }),
        })
      )
    })

    it('should sort by specified field', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockPartenaireFindMany.mockResolvedValue([])
      mockPartenaireCount.mockResolvedValue(0)

      const request = makeRequest('GET', '/api/v1/partenaires?sort=ville&order=desc')
      const response = await listPartnersHandler(request)

      expect(response.status).toBe(200)
      expect(mockPartenaireFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { ville: 'desc' } })
      )
    })

    it('should default to nom_partenaire for invalid sort field', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockPartenaireFindMany.mockResolvedValue([])
      mockPartenaireCount.mockResolvedValue(0)

      const request = makeRequest('GET', '/api/v1/partenaires?sort=invalid_field')
      const response = await listPartnersHandler(request)

      expect(response.status).toBe(200)
      expect(mockPartenaireFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { nom_partenaire: 'asc' } })
      )
    })
  })

  describe('GET by id', () => {
    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Invalid or missing API key'))

      const request = makeRequest('GET', '/api/v1/partenaires/1')
      const response = await getPartnerByIdHandler(request)

      expect(response.status).toBe(401)
    })

    it('should return partner by id', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockPartenaireFindUnique.mockResolvedValue(mockPartner)

      const request = makeRequest('GET', '/api/v1/partenaires/1')
      const response = await getPartnerByIdHandler(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.nom_partenaire).toBe('Client Alpha')
      expect(data.id_partenaire).toBe(1)
    })

    it('should return 404 for non-existent partner', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockPartenaireFindUnique.mockResolvedValue(null)

      const request = makeRequest('GET', '/api/v1/partenaires/999')
      const response = await getPartnerByIdHandler(request)

      expect(response.status).toBe(404)
    })

    it('should return 400 for invalid id', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)

      const request = makeRequest('GET', '/api/v1/partenaires/abc')
      const response = await getPartnerByIdHandler(request)

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
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Invalid or missing API key'))

      const request = makeRequest('POST', '/api/v1/partenaires', createBody)
      const response = await createPartnerHandler(request)

      expect(response.status).toBe(401)
    })

    it('should create a partner and return 201', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockPartenaireFindUnique.mockResolvedValue(null)
      mockPartenaireCreate.mockResolvedValue({ ...mockPartner, code_partenaire: 'P-002', nom_partenaire: 'New Partner' })

      const request = makeRequest('POST', '/api/v1/partenaires', createBody)
      const response = await createPartnerHandler(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.nom_partenaire).toBe('New Partner')
      expect(mockPartenaireCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            code_partenaire: 'P-002',
            nom_partenaire: 'New Partner',
            cree_par: 'user-api-1',
          }),
        })
      )
    })

    it('should return 409 on duplicate code', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockPartenaireFindUnique.mockResolvedValue(mockPartner)

      const request = makeRequest('POST', '/api/v1/partenaires', { ...createBody, code_partenaire: 'P-001' })
      const response = await createPartnerHandler(request)

      expect(response.status).toBe(409)
    })

    it('should return 400 for missing required fields', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)

      const request = makeRequest('POST', '/api/v1/partenaires', { nom_partenaire: 'No Code' })
      const response = await createPartnerHandler(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.code).toBe('VALIDATION_ERROR')
    })

    it('should return 400 for invalid email format', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)

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
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Invalid or missing API key'))

      const request = makeRequest('PUT', '/api/v1/partenaires/1', updateBody)
      const response = await updatePartnerHandler(request)

      expect(response.status).toBe(401)
    })

    it('should update a partner', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockPartenaireFindUnique.mockResolvedValue(mockPartner)
      mockPartenaireUpdate.mockResolvedValue({ ...mockPartner, nom_partenaire: 'Updated Partner' })

      const request = makeRequest('PUT', '/api/v1/partenaires/1', updateBody)
      const response = await updatePartnerHandler(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.nom_partenaire).toBe('Updated Partner')
      expect(mockPartenaireUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id_partenaire: 1 },
          data: expect.objectContaining({
            nom_partenaire: 'Updated Partner',
            modifie_par: 'user-api-1',
          }),
        })
      )
    })

    it('should return 404 for non-existent partner', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockPartenaireFindUnique.mockResolvedValue(null)

      const request = makeRequest('PUT', '/api/v1/partenaires/999', updateBody)
      const response = await updatePartnerHandler(request)

      expect(response.status).toBe(404)
    })

    it('should return 409 on duplicate code change', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockPartenaireFindUnique
        .mockResolvedValueOnce(mockPartner)
        .mockResolvedValueOnce({ ...mockPartner, id_partenaire: 2 })

      const request = makeRequest('PUT', '/api/v1/partenaires/1', { code_partenaire: 'P-999' })
      const response = await updatePartnerHandler(request)

      expect(response.status).toBe(409)
    })
  })

  describe('DELETE', () => {
    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Invalid or missing API key'))

      const request = makeRequest('DELETE', '/api/v1/partenaires/1')
      const response = await deletePartnerHandler(request)

      expect(response.status).toBe(401)
    })

    it('should soft-delete a partner', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockGetApiUser.mockResolvedValue(API_USER)
      mockPartenaireFindUnique.mockResolvedValue(mockPartner)
      mockPartenaireUpdate.mockResolvedValue({ ...mockPartner, est_actif: false })

      const request = makeRequest('DELETE', '/api/v1/partenaires/1')
      const response = await deletePartnerHandler(request)

      expect(response.status).toBe(204)
      expect(mockPartenaireUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id_partenaire: 1 },
          data: expect.objectContaining({ est_actif: false }),
        })
      )
    })

    it('should return 404 for non-existent partner', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockPartenaireFindUnique.mockResolvedValue(null)

      const request = makeRequest('DELETE', '/api/v1/partenaires/999')
      const response = await deletePartnerHandler(request)

      expect(response.status).toBe(404)
    })
  })

  describe('GET documents', () => {
    it('should return partner documents', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockPartenaireFindUnique.mockResolvedValue(mockPartner)
      mockDocVenteFindMany.mockResolvedValue([{ id_document: 1, numero_document: 'FAC-001' }])
      mockDocVenteCount.mockResolvedValue(1)

      const request = makeRequest('GET', '/api/v1/partenaires/1/documents')
      const response = await getPartnerDocumentsHandler(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data).toHaveLength(1)
      expect(data.data[0].id_document).toBe(1)
    })

    it('should return 404 for non-existent partner', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockPartenaireFindUnique.mockResolvedValue(null)

      const request = makeRequest('GET', '/api/v1/partenaires/999/documents')
      const response = await getPartnerDocumentsHandler(request)

      expect(response.status).toBe(404)
    })
  })
})

describe('Rate Limiting', () => {
  it('should return 429 when rate limit exceeded', async () => {
    mockCacheIncrement.mockResolvedValue(31)
    mockRequireApiKey.mockResolvedValue({ userId: 'user-1', role: 'ADMIN' as const, keyId: 'key-1' })
    mockPartenaireCreate.mockResolvedValue(mockPartner)
    mockPartenaireFindUnique.mockResolvedValue(null)

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
