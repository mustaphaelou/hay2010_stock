import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockEntrepotFindMany, mockEntrepotCount, mockEntrepotFindUnique, mockEntrepotCreate, mockEntrepotUpdate, mockNiveauStockFindMany, mockNiveauStockCount, mockRequireApiKey, mockGetApiUser, mockCacheIncrement } = vi.hoisted(() => ({
  mockEntrepotFindMany: vi.fn(),
  mockEntrepotCount: vi.fn(),
  mockEntrepotFindUnique: vi.fn(),
  mockEntrepotCreate: vi.fn(),
  mockEntrepotUpdate: vi.fn(),
  mockNiveauStockFindMany: vi.fn(),
  mockNiveauStockCount: vi.fn(),
  mockRequireApiKey: vi.fn(),
  mockGetApiUser: vi.fn(),
  mockCacheIncrement: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    entrepot: {
      findMany: mockEntrepotFindMany,
      count: mockEntrepotCount,
      findUnique: mockEntrepotFindUnique,
      create: mockEntrepotCreate,
      update: mockEntrepotUpdate,
    },
    niveauStock: {
      findMany: mockNiveauStockFindMany,
      count: mockNiveauStockCount,
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
  listWarehousesHandler,
  getWarehouseByIdHandler,
  createWarehouseHandler,
  updateWarehouseHandler,
  deleteWarehouseHandler,
  getWarehouseStockLevelsHandler,
} from '@/lib/api/handlers/entrepots'
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

const mockEntrepot = {
  id_entrepot: 1,
  code_entrepot: 'WH-001',
  nom_entrepot: 'Entrepôt Test',
  adresse_entrepot: null,
  ville_entrepot: 'Casablanca',
  code_postal_entrepot: null,
  capacite_totale_unites: null,
  nom_responsable: null,
  email_responsable: null,
  telephone_responsable: null,
  est_actif: true,
  est_entrepot_principal: false,
  date_creation: new Date('2025-01-01'),
  date_modification: new Date('2025-06-01'),
}

describe('Entrepot API Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCacheIncrement.mockResolvedValue(1)
  })

  describe('GET list', () => {
    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Invalid or missing API key'))

      const request = makeRequest('GET', '/api/v1/entrepots')
      const response = await listWarehousesHandler(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.code).toBe('AUTHENTICATION_ERROR')
    })

    it('should return paginated warehouses', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockEntrepotFindMany.mockResolvedValue([mockEntrepot])
      mockEntrepotCount.mockResolvedValue(1)

      const request = makeRequest('GET', '/api/v1/entrepots')
      const response = await listWarehousesHandler(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data).toHaveLength(1)
      expect(data.data[0].nom_entrepot).toBe('Entrepôt Test')
      expect(data.meta.total).toBe(1)
      expect(data.meta.page).toBe(1)
    })

    it('should filter by est_entrepot_principal', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockEntrepotFindMany.mockResolvedValue([{ ...mockEntrepot, est_entrepot_principal: true }])
      mockEntrepotCount.mockResolvedValue(1)

      const request = makeRequest('GET', '/api/v1/entrepots?principal=true')
      const response = await listWarehousesHandler(request)

      expect(response.status).toBe(200)
      expect(mockEntrepotFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { est_entrepot_principal: true } })
      )
    })

    it('should search by nom_entrepot and code_entrepot', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockEntrepotFindMany.mockResolvedValue([mockEntrepot])
      mockEntrepotCount.mockResolvedValue(1)

      const request = makeRequest('GET', '/api/v1/entrepots?search=WH')
      const response = await listWarehousesHandler(request)

      expect(response.status).toBe(200)
      expect(mockEntrepotFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { nom_entrepot: { contains: 'WH', mode: 'insensitive' } },
              { code_entrepot: { contains: 'WH', mode: 'insensitive' } },
            ]),
          }),
        })
      )
    })

    it('should sort by specified field', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockEntrepotFindMany.mockResolvedValue([])
      mockEntrepotCount.mockResolvedValue(0)

      const request = makeRequest('GET', '/api/v1/entrepots?sort=ville_entrepot&order=desc')
      const response = await listWarehousesHandler(request)

      expect(response.status).toBe(200)
      expect(mockEntrepotFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { ville_entrepot: 'desc' } })
      )
    })

    it('should default to nom_entrepot for invalid sort field', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockEntrepotFindMany.mockResolvedValue([])
      mockEntrepotCount.mockResolvedValue(0)

      const request = makeRequest('GET', '/api/v1/entrepots?sort=invalid_field')
      const response = await listWarehousesHandler(request)

      expect(response.status).toBe(200)
      expect(mockEntrepotFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { nom_entrepot: 'asc' } })
      )
    })
  })

  describe('GET by id', () => {
    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Invalid or missing API key'))

      const request = makeRequest('GET', '/api/v1/entrepots/1')
      const response = await getWarehouseByIdHandler(request)

      expect(response.status).toBe(401)
    })

    it('should return warehouse by id', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockEntrepotFindUnique.mockResolvedValue(mockEntrepot)

      const request = makeRequest('GET', '/api/v1/entrepots/1')
      const response = await getWarehouseByIdHandler(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.nom_entrepot).toBe('Entrepôt Test')
      expect(data.id_entrepot).toBe(1)
    })

    it('should return 404 for non-existent warehouse', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockEntrepotFindUnique.mockResolvedValue(null)

      const request = makeRequest('GET', '/api/v1/entrepots/999')
      const response = await getWarehouseByIdHandler(request)

      expect(response.status).toBe(404)
    })

    it('should return 400 for invalid id', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)

      const request = makeRequest('GET', '/api/v1/entrepots/abc')
      const response = await getWarehouseByIdHandler(request)

      expect(response.status).toBe(400)
    })
  })

  describe('POST create', () => {
    const createBody = {
      code_entrepot: 'WH-002',
      nom_entrepot: 'New Warehouse',
    }

    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Invalid or missing API key'))

      const request = makeRequest('POST', '/api/v1/entrepots', createBody)
      const response = await createWarehouseHandler(request)

      expect(response.status).toBe(401)
    })

    it('should create a warehouse and return 201', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockEntrepotFindUnique.mockResolvedValue(null)
      mockEntrepotCreate.mockResolvedValue({ ...mockEntrepot, code_entrepot: 'WH-002', nom_entrepot: 'New Warehouse' })

      const request = makeRequest('POST', '/api/v1/entrepots', createBody)
      const response = await createWarehouseHandler(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.nom_entrepot).toBe('New Warehouse')
      expect(mockEntrepotCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            code_entrepot: 'WH-002',
            nom_entrepot: 'New Warehouse',
          }),
        })
      )
    })

    it('should return 409 on duplicate code', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockEntrepotFindUnique.mockResolvedValue(mockEntrepot)

      const request = makeRequest('POST', '/api/v1/entrepots', { ...createBody, code_entrepot: 'WH-001' })
      const response = await createWarehouseHandler(request)

      expect(response.status).toBe(409)
    })

    it('should return 400 for missing required fields', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)

      const request = makeRequest('POST', '/api/v1/entrepots', { nom_entrepot: 'No Code' })
      const response = await createWarehouseHandler(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.code).toBe('VALIDATION_ERROR')
    })

    it('should return 400 for invalid email format', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)

      const request = makeRequest('POST', '/api/v1/entrepots', {
        ...createBody,
        email_responsable: 'not-an-email',
      })
      const response = await createWarehouseHandler(request)

      expect(response.status).toBe(400)
    })
  })

  describe('PUT update', () => {
    const updateBody = { nom_entrepot: 'Updated Warehouse' }

    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Invalid or missing API key'))

      const request = makeRequest('PUT', '/api/v1/entrepots/1', updateBody)
      const response = await updateWarehouseHandler(request)

      expect(response.status).toBe(401)
    })

    it('should update a warehouse', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockEntrepotFindUnique.mockResolvedValue(mockEntrepot)
      mockEntrepotUpdate.mockResolvedValue({ ...mockEntrepot, nom_entrepot: 'Updated Warehouse' })

      const request = makeRequest('PUT', '/api/v1/entrepots/1', updateBody)
      const response = await updateWarehouseHandler(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.nom_entrepot).toBe('Updated Warehouse')
      expect(mockEntrepotUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id_entrepot: 1 },
          data: expect.objectContaining({
            nom_entrepot: 'Updated Warehouse',
          }),
        })
      )
    })

    it('should return 404 for non-existent warehouse', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockEntrepotFindUnique.mockResolvedValue(null)

      const request = makeRequest('PUT', '/api/v1/entrepots/999', updateBody)
      const response = await updateWarehouseHandler(request)

      expect(response.status).toBe(404)
    })

    it('should return 409 on duplicate code change', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockEntrepotFindUnique
        .mockResolvedValueOnce(mockEntrepot)
        .mockResolvedValueOnce({ ...mockEntrepot, id_entrepot: 2 })

      const request = makeRequest('PUT', '/api/v1/entrepots/1', { code_entrepot: 'WH-999' })
      const response = await updateWarehouseHandler(request)

      expect(response.status).toBe(409)
    })
  })

  describe('DELETE', () => {
    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Invalid or missing API key'))

      const request = makeRequest('DELETE', '/api/v1/entrepots/1')
      const response = await deleteWarehouseHandler(request)

      expect(response.status).toBe(401)
    })

    it('should soft-delete a warehouse', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockGetApiUser.mockResolvedValue(API_USER)
      mockEntrepotFindUnique.mockResolvedValue(mockEntrepot)
      mockEntrepotUpdate.mockResolvedValue({ ...mockEntrepot, est_actif: false })

      const request = makeRequest('DELETE', '/api/v1/entrepots/1')
      const response = await deleteWarehouseHandler(request)

      expect(response.status).toBe(204)
      expect(mockEntrepotUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id_entrepot: 1 },
          data: expect.objectContaining({ est_actif: false }),
        })
      )
    })

    it('should return 404 for non-existent warehouse', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockEntrepotFindUnique.mockResolvedValue(null)

      const request = makeRequest('DELETE', '/api/v1/entrepots/999')
      const response = await deleteWarehouseHandler(request)

      expect(response.status).toBe(404)
    })
  })

  describe('GET stock levels', () => {
    it('should return warehouse stock levels', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockEntrepotFindUnique.mockResolvedValue(mockEntrepot)
      mockNiveauStockFindMany.mockResolvedValue([{ id_niveau_stock: 1, quantite: 100 }])
      mockNiveauStockCount.mockResolvedValue(1)

      const request = makeRequest('GET', '/api/v1/entrepots/1/stock-levels')
      const response = await getWarehouseStockLevelsHandler(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data).toHaveLength(1)
      expect(data.data[0].id_niveau_stock).toBe(1)
    })

    it('should return 404 for non-existent warehouse', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockEntrepotFindUnique.mockResolvedValue(null)

      const request = makeRequest('GET', '/api/v1/entrepots/999/stock-levels')
      const response = await getWarehouseStockLevelsHandler(request)

      expect(response.status).toBe(404)
    })
  })
})

describe('Rate Limiting', () => {
  it('should return 429 when rate limit exceeded', async () => {
    mockCacheIncrement.mockResolvedValue(31)
    mockRequireApiKey.mockResolvedValue({ userId: 'user-1', role: 'ADMIN' as const, keyId: 'key-1' })
    mockEntrepotCreate.mockResolvedValue(mockEntrepot)
    mockEntrepotFindUnique.mockResolvedValue(null)

    const { POST } = await import('@/app/api/v1/entrepots/route')
    const request = makeRequest('POST', '/api/v1/entrepots', {
      code_entrepot: 'WH-RATE',
      nom_entrepot: 'Rate Limit Test',
    })

    const response = await POST(request)

    expect(response.status).toBe(429)
    const data = await response.json()
    expect(data.code).toBe('RATE_LIMIT_EXCEEDED')
  })
})
