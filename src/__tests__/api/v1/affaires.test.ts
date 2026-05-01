import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockAffaireFindMany, mockAffaireCount, mockAffaireFindUnique, mockAffaireCreate, mockAffaireUpdate, mockDocVenteFindMany, mockDocVenteCount, mockRequireApiKey, mockGetApiUser, mockCacheIncrement } = vi.hoisted(() => ({
  mockAffaireFindMany: vi.fn(),
  mockAffaireCount: vi.fn(),
  mockAffaireFindUnique: vi.fn(),
  mockAffaireCreate: vi.fn(),
  mockAffaireUpdate: vi.fn(),
  mockDocVenteFindMany: vi.fn(),
  mockDocVenteCount: vi.fn(),
  mockRequireApiKey: vi.fn(),
  mockGetApiUser: vi.fn(),
  mockCacheIncrement: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    affaire: {
      findMany: mockAffaireFindMany,
      count: mockAffaireCount,
      findUnique: mockAffaireFindUnique,
      create: mockAffaireCreate,
      update: mockAffaireUpdate,
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
  listAffairesHandler,
  getAffaireByIdHandler,
  createAffaireHandler,
  updateAffaireHandler,
  deleteAffaireHandler,
  getAffaireDocumentsHandler,
} from '@/lib/api/handlers/affaires'
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

const mockAffaire = {
  id_affaire: 1,
  code_affaire: 'AFF-001',
  intitule_affaire: 'Affaire Test',
  type_affaire: 'Proposition',
  statut_affaire: 'En cours',
  abrege: null,
  id_client: null,
  date_debut: null,
  date_fin_prevue: null,
  date_fin_reelle: null,
  budget_prevu: null,
  chiffre_affaires: 0,
  marge: 0,
  taux_remise_moyen: 0,
  notes: null,
  est_actif: true,
  en_sommeil: false,
  date_creation: new Date('2025-01-01'),
  date_modification: new Date('2025-06-01'),
  cree_par: null,
  modifie_par: null,
}

describe('Affaire API Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCacheIncrement.mockResolvedValue(1)
  })

  describe('GET list', () => {
    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Invalid or missing API key'))

      const request = makeRequest('GET', '/api/v1/affaires')
      const response = await listAffairesHandler(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.code).toBe('AUTHENTICATION_ERROR')
    })

    it('should return paginated affaires', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockAffaireFindMany.mockResolvedValue([mockAffaire])
      mockAffaireCount.mockResolvedValue(1)

      const request = makeRequest('GET', '/api/v1/affaires')
      const response = await listAffairesHandler(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data).toHaveLength(1)
      expect(data.data[0].intitule_affaire).toBe('Affaire Test')
      expect(data.meta.total).toBe(1)
      expect(data.meta.page).toBe(1)
    })

    it('should filter by type', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockAffaireFindMany.mockResolvedValue([{ ...mockAffaire, type_affaire: 'Commande' }])
      mockAffaireCount.mockResolvedValue(1)

      const request = makeRequest('GET', '/api/v1/affaires?type=Commande')
      const response = await listAffairesHandler(request)

      expect(response.status).toBe(200)
      expect(mockAffaireFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { type_affaire: 'Commande' } })
      )
    })

    it('should filter by statut', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockAffaireFindMany.mockResolvedValue([{ ...mockAffaire, statut_affaire: 'Terminé' }])
      mockAffaireCount.mockResolvedValue(1)

      const request = makeRequest('GET', '/api/v1/affaires?statut=Terminé')
      const response = await listAffairesHandler(request)

      expect(response.status).toBe(200)
      expect(mockAffaireFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { statut_affaire: 'Terminé' } })
      )
    })

    it('should filter by client', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockAffaireFindMany.mockResolvedValue([{ ...mockAffaire, id_client: 5 }])
      mockAffaireCount.mockResolvedValue(1)

      const request = makeRequest('GET', '/api/v1/affaires?client=5')
      const response = await listAffairesHandler(request)

      expect(response.status).toBe(200)
      expect(mockAffaireFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id_client: 5 } })
      )
    })

    it('should search by intitule_affaire and code_affaire', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockAffaireFindMany.mockResolvedValue([mockAffaire])
      mockAffaireCount.mockResolvedValue(1)

      const request = makeRequest('GET', '/api/v1/affaires?search=Test')
      const response = await listAffairesHandler(request)

      expect(response.status).toBe(200)
      expect(mockAffaireFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { intitule_affaire: { contains: 'Test', mode: 'insensitive' } },
              { code_affaire: { contains: 'Test', mode: 'insensitive' } },
            ]),
          }),
        })
      )
    })

    it('should sort by specified field', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockAffaireFindMany.mockResolvedValue([])
      mockAffaireCount.mockResolvedValue(0)

      const request = makeRequest('GET', '/api/v1/affaires?sort=intitule_affaire&order=asc')
      const response = await listAffairesHandler(request)

      expect(response.status).toBe(200)
      expect(mockAffaireFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { intitule_affaire: 'asc' } })
      )
    })

    it('should default to date_creation for invalid sort field', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockAffaireFindMany.mockResolvedValue([])
      mockAffaireCount.mockResolvedValue(0)

      const request = makeRequest('GET', '/api/v1/affaires?sort=invalid_field')
      const response = await listAffairesHandler(request)

      expect(response.status).toBe(200)
      expect(mockAffaireFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { date_creation: 'desc' } })
      )
    })
  })

  describe('GET by id', () => {
    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Invalid or missing API key'))

      const request = makeRequest('GET', '/api/v1/affaires/1')
      const response = await getAffaireByIdHandler(request)

      expect(response.status).toBe(401)
    })

    it('should return affaire by id with client included', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockAffaireFindUnique.mockResolvedValue({
        ...mockAffaire,
        client: { id_partenaire: 10, code_partenaire: 'CL-001', nom_partenaire: 'Client Test' },
      })

      const request = makeRequest('GET', '/api/v1/affaires/1')
      const response = await getAffaireByIdHandler(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.intitule_affaire).toBe('Affaire Test')
      expect(data.id_affaire).toBe(1)
      expect(data.client).toEqual({
        id_partenaire: 10,
        code_partenaire: 'CL-001',
        nom_partenaire: 'Client Test',
      })
    })

    it('should return 404 for non-existent affaire', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockAffaireFindUnique.mockResolvedValue(null)

      const request = makeRequest('GET', '/api/v1/affaires/999')
      const response = await getAffaireByIdHandler(request)

      expect(response.status).toBe(404)
    })

    it('should return 400 for invalid id', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)

      const request = makeRequest('GET', '/api/v1/affaires/abc')
      const response = await getAffaireByIdHandler(request)

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
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Invalid or missing API key'))

      const request = makeRequest('POST', '/api/v1/affaires', createBody)
      const response = await createAffaireHandler(request)

      expect(response.status).toBe(401)
    })

    it('should create an affaire and return 201', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockAffaireFindUnique.mockResolvedValue(null)
      mockAffaireCreate.mockResolvedValue({
        ...mockAffaire,
        code_affaire: 'AFF-002',
        intitule_affaire: 'New Affaire',
      })

      const request = makeRequest('POST', '/api/v1/affaires', createBody)
      const response = await createAffaireHandler(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.intitule_affaire).toBe('New Affaire')
      expect(mockAffaireCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            code_affaire: 'AFF-002',
            intitule_affaire: 'New Affaire',
            cree_par: 'user-api-1',
          }),
        })
      )
    })

    it('should return 409 on duplicate code', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockAffaireFindUnique.mockResolvedValue(mockAffaire)

      const request = makeRequest('POST', '/api/v1/affaires', { ...createBody, code_affaire: 'AFF-001' })
      const response = await createAffaireHandler(request)

      expect(response.status).toBe(409)
    })

    it('should return 400 for missing required fields', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)

      const request = makeRequest('POST', '/api/v1/affaires', { intitule_affaire: 'No Code' })
      const response = await createAffaireHandler(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.code).toBe('VALIDATION_ERROR')
    })

    it('should handle date_debut, date_fin_prevue, date_fin_reelle transformations', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockAffaireFindUnique.mockResolvedValue(null)
      mockAffaireCreate.mockResolvedValue({
        ...mockAffaire,
        date_debut: new Date('2025-03-01'),
        date_fin_prevue: new Date('2025-12-01'),
      })

      const request = makeRequest('POST', '/api/v1/affaires', {
        ...createBody,
        date_debut: '2025-03-01',
        date_fin_prevue: '2025-12-01',
      })
      const response = await createAffaireHandler(request)

      expect(response.status).toBe(201)
      expect(mockAffaireCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            date_debut: new Date('2025-03-01'),
            date_fin_prevue: new Date('2025-12-01'),
          }),
        })
      )
    })
  })

  describe('PUT update', () => {
    const updateBody = { intitule_affaire: 'Updated Affaire' }

    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Invalid or missing API key'))

      const request = makeRequest('PUT', '/api/v1/affaires/1', updateBody)
      const response = await updateAffaireHandler(request)

      expect(response.status).toBe(401)
    })

    it('should update an affaire', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockAffaireFindUnique.mockResolvedValue(mockAffaire)
      mockAffaireUpdate.mockResolvedValue({ ...mockAffaire, intitule_affaire: 'Updated Affaire' })

      const request = makeRequest('PUT', '/api/v1/affaires/1', updateBody)
      const response = await updateAffaireHandler(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.intitule_affaire).toBe('Updated Affaire')
      expect(mockAffaireUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id_affaire: 1 },
          data: expect.objectContaining({
            intitule_affaire: 'Updated Affaire',
            modifie_par: 'user-api-1',
          }),
        })
      )
    })

    it('should return 404 for non-existent affaire', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockAffaireFindUnique.mockResolvedValue(null)

      const request = makeRequest('PUT', '/api/v1/affaires/999', updateBody)
      const response = await updateAffaireHandler(request)

      expect(response.status).toBe(404)
    })

    it('should return 409 on duplicate code change', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockAffaireFindUnique
        .mockResolvedValueOnce(mockAffaire)
        .mockResolvedValueOnce({ ...mockAffaire, id_affaire: 2 })

      const request = makeRequest('PUT', '/api/v1/affaires/1', { code_affaire: 'AFF-999' })
      const response = await updateAffaireHandler(request)

      expect(response.status).toBe(409)
    })

    it('should handle date transformations on update', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockAffaireFindUnique.mockResolvedValue(mockAffaire)
      mockAffaireUpdate.mockResolvedValue({
        ...mockAffaire,
        date_fin_reelle: new Date('2025-08-15'),
      })

      const request = makeRequest('PUT', '/api/v1/affaires/1', {
        ...updateBody,
        date_fin_reelle: '2025-08-15',
      })
      const response = await updateAffaireHandler(request)

      expect(response.status).toBe(200)
      expect(mockAffaireUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            date_fin_reelle: new Date('2025-08-15'),
          }),
        })
      )
    })
  })

  describe('DELETE', () => {
    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Invalid or missing API key'))

      const request = makeRequest('DELETE', '/api/v1/affaires/1')
      const response = await deleteAffaireHandler(request)

      expect(response.status).toBe(401)
    })

    it('should soft-delete an affaire', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockGetApiUser.mockResolvedValue(API_USER)
      mockAffaireFindUnique.mockResolvedValue(mockAffaire)
      mockAffaireUpdate.mockResolvedValue({ ...mockAffaire, est_actif: false })

      const request = makeRequest('DELETE', '/api/v1/affaires/1')
      const response = await deleteAffaireHandler(request)

      expect(response.status).toBe(204)
      expect(mockAffaireUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id_affaire: 1 },
          data: expect.objectContaining({ est_actif: false }),
        })
      )
    })

    it('should return 404 for non-existent affaire', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockAffaireFindUnique.mockResolvedValue(null)

      const request = makeRequest('DELETE', '/api/v1/affaires/999')
      const response = await deleteAffaireHandler(request)

      expect(response.status).toBe(404)
    })
  })

  describe('GET documents', () => {
    it('should return affaire documents', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockAffaireFindUnique.mockResolvedValue(mockAffaire)
      mockDocVenteFindMany.mockResolvedValue([{ id_document: 1, numero_document: 'FAC-001' }])
      mockDocVenteCount.mockResolvedValue(1)

      const request = makeRequest('GET', '/api/v1/affaires/1/documents')
      const response = await getAffaireDocumentsHandler(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data).toHaveLength(1)
      expect(data.data[0].id_document).toBe(1)
    })

    it('should return 404 for non-existent affaire', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockAffaireFindUnique.mockResolvedValue(null)

      const request = makeRequest('GET', '/api/v1/affaires/999/documents')
      const response = await getAffaireDocumentsHandler(request)

      expect(response.status).toBe(404)
    })

    it('should return 400 for invalid affaire id', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)

      const request = makeRequest('GET', '/api/v1/affaires/abc/documents')
      const response = await getAffaireDocumentsHandler(request)

      expect(response.status).toBe(400)
    })
  })
})

describe('Rate Limiting', () => {
  it('should return 429 when rate limit exceeded', async () => {
    mockCacheIncrement.mockResolvedValue(31)
    mockRequireApiKey.mockResolvedValue({ userId: 'user-1', role: 'ADMIN' as const, keyId: 'key-1' })
    mockAffaireCreate.mockResolvedValue(mockAffaire)
    mockAffaireFindUnique.mockResolvedValue(null)

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
