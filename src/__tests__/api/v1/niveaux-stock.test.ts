import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockNiveauStockFindMany, mockNiveauStockCount, mockNiveauStockFindUnique, mockNiveauStockCreate, mockNiveauStockUpdate, mockNiveauStockDelete, mockProduitFindUnique, mockEntrepotFindUnique, mockRequireApiKey, mockCacheIncrement } = vi.hoisted(() => ({
  mockNiveauStockFindMany: vi.fn(),
  mockNiveauStockCount: vi.fn(),
  mockNiveauStockFindUnique: vi.fn(),
  mockNiveauStockCreate: vi.fn(),
  mockNiveauStockUpdate: vi.fn(),
  mockNiveauStockDelete: vi.fn(),
  mockProduitFindUnique: vi.fn(),
  mockEntrepotFindUnique: vi.fn(),
  mockRequireApiKey: vi.fn(),
  mockCacheIncrement: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    niveauStock: {
      findMany: mockNiveauStockFindMany,
      count: mockNiveauStockCount,
      findUnique: mockNiveauStockFindUnique,
      create: mockNiveauStockCreate,
      update: mockNiveauStockUpdate,
      delete: mockNiveauStockDelete,
    },
    produit: {
      findUnique: mockProduitFindUnique,
    },
    entrepot: {
      findUnique: mockEntrepotFindUnique,
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
  listStockLevelsHandler,
  getStockLevelByIdHandler,
  createStockLevelHandler,
  updateStockLevelHandler,
  deleteStockLevelHandler,
} from '@/lib/api/handlers/niveaux-stock'
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

const mockStockLevel = {
  id_stock: 1,
  id_produit: 1,
  id_entrepot: 1,
  quantite_en_stock: 100,
  quantite_reservee: 5,
  quantite_commandee: 10,
  date_dernier_mouvement: null,
  type_dernier_mouvement: null,
  date_creation: new Date('2025-01-01'),
  date_modification: new Date('2025-06-01'),
}

const mockStockLevelWithRelations = {
  ...mockStockLevel,
  produit: { id_produit: 1, code_produit: 'PROD-001', nom_produit: 'Produit A' },
  entrepot: { id_entrepot: 1, code_entrepot: 'ENT-001', nom_entrepot: 'Entrepot Principal' },
}

const mockProduct = { id_produit: 1, code_produit: 'PROD-001', nom_produit: 'Produit A' }

const mockWarehouse = { id_entrepot: 1, code_entrepot: 'ENT-001', nom_entrepot: 'Entrepot Principal' }

describe('NiveauStock API Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCacheIncrement.mockResolvedValue(1)
  })

  describe('GET list', () => {
    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Invalid or missing API key'))

      const request = makeRequest('GET', '/api/v1/niveaux-stock')
      const response = await listStockLevelsHandler(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.code).toBe('AUTHENTICATION_ERROR')
    })

    it('should return paginated stock levels with produit and entrepot', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockNiveauStockFindMany.mockResolvedValue([mockStockLevelWithRelations])
      mockNiveauStockCount.mockResolvedValue(1)

      const request = makeRequest('GET', '/api/v1/niveaux-stock')
      const response = await listStockLevelsHandler(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data).toHaveLength(1)
      expect(data.data[0].id_stock).toBe(1)
      expect(data.data[0].produit.nom_produit).toBe('Produit A')
      expect(data.data[0].entrepot.nom_entrepot).toBe('Entrepot Principal')
      expect(data.meta.total).toBe(1)
      expect(data.meta.page).toBe(1)
      expect(mockNiveauStockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            produit: expect.any(Object),
            entrepot: expect.any(Object),
          }),
        })
      )
    })

    it('should filter by produit', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockNiveauStockFindMany.mockResolvedValue([])
      mockNiveauStockCount.mockResolvedValue(0)

      const request = makeRequest('GET', '/api/v1/niveaux-stock?produit=1')
      const response = await listStockLevelsHandler(request)

      expect(response.status).toBe(200)
      expect(mockNiveauStockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id_produit: 1 } })
      )
    })

    it('should filter by entrepot', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockNiveauStockFindMany.mockResolvedValue([])
      mockNiveauStockCount.mockResolvedValue(0)

      const request = makeRequest('GET', '/api/v1/niveaux-stock?entrepot=1')
      const response = await listStockLevelsHandler(request)

      expect(response.status).toBe(200)
      expect(mockNiveauStockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id_entrepot: 1 } })
      )
    })

    it('should sort by specified field', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockNiveauStockFindMany.mockResolvedValue([])
      mockNiveauStockCount.mockResolvedValue(0)

      const request = makeRequest('GET', '/api/v1/niveaux-stock?sort=quantite_en_stock&order=asc')
      const response = await listStockLevelsHandler(request)

      expect(response.status).toBe(200)
      expect(mockNiveauStockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { quantite_en_stock: 'asc' } })
      )
    })

    it('should default to date_creation for invalid sort field', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockNiveauStockFindMany.mockResolvedValue([])
      mockNiveauStockCount.mockResolvedValue(0)

      const request = makeRequest('GET', '/api/v1/niveaux-stock?sort=invalid_field')
      const response = await listStockLevelsHandler(request)

      expect(response.status).toBe(200)
      expect(mockNiveauStockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { date_creation: 'desc' } })
      )
    })
  })

  describe('GET by id', () => {
    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Invalid or missing API key'))

      const request = makeRequest('GET', '/api/v1/niveaux-stock/1')
      const response = await getStockLevelByIdHandler(request)

      expect(response.status).toBe(401)
    })

    it('should return stock level by id with produit and entrepot', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockNiveauStockFindUnique.mockResolvedValue(mockStockLevelWithRelations)

      const request = makeRequest('GET', '/api/v1/niveaux-stock/1')
      const response = await getStockLevelByIdHandler(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.id_stock).toBe(1)
      expect(data.produit.nom_produit).toBe('Produit A')
      expect(data.entrepot.nom_entrepot).toBe('Entrepot Principal')
      expect(mockNiveauStockFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id_stock: 1 },
          include: expect.objectContaining({
            produit: expect.any(Object),
            entrepot: expect.any(Object),
          }),
        })
      )
    })

    it('should return 404 for non-existent stock level', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockNiveauStockFindUnique.mockResolvedValue(null)

      const request = makeRequest('GET', '/api/v1/niveaux-stock/999')
      const response = await getStockLevelByIdHandler(request)

      expect(response.status).toBe(404)
    })

    it('should return 400 for invalid id', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)

      const request = makeRequest('GET', '/api/v1/niveaux-stock/abc')
      const response = await getStockLevelByIdHandler(request)

      expect(response.status).toBe(400)
    })
  })

  describe('POST create', () => {
    const createBody = {
      id_produit: 1,
      id_entrepot: 1,
      quantite_en_stock: 100,
    }

    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Invalid or missing API key'))

      const request = makeRequest('POST', '/api/v1/niveaux-stock', createBody)
      const response = await createStockLevelHandler(request)

      expect(response.status).toBe(401)
    })

    it('should create a stock level and return 201', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockNiveauStockFindUnique.mockResolvedValue(null)
      mockProduitFindUnique.mockResolvedValue(mockProduct)
      mockEntrepotFindUnique.mockResolvedValue(mockWarehouse)
      mockNiveauStockCreate.mockResolvedValue(mockStockLevel)

      const request = makeRequest('POST', '/api/v1/niveaux-stock', createBody)
      const response = await createStockLevelHandler(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.id_stock).toBe(1)
      expect(data.id_produit).toBe(1)
      expect(mockNiveauStockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id_produit: 1,
            id_entrepot: 1,
            quantite_en_stock: 100,
          }),
        })
      )
    })

    it('should return 409 on duplicate produit-entrepot combination', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockNiveauStockFindUnique.mockResolvedValue(mockStockLevel)

      const request = makeRequest('POST', '/api/v1/niveaux-stock', createBody)
      const response = await createStockLevelHandler(request)

      expect(response.status).toBe(409)
      expect(mockNiveauStockFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id_produit_id_entrepot: {
              id_produit: 1,
              id_entrepot: 1,
            },
          },
        })
      )
    })

    it('should return 404 when produit not found', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockNiveauStockFindUnique.mockResolvedValue(null)
      mockProduitFindUnique.mockResolvedValue(null)

      const request = makeRequest('POST', '/api/v1/niveaux-stock', createBody)
      const response = await createStockLevelHandler(request)

      expect(response.status).toBe(404)
    })

    it('should return 404 when entrepot not found', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockNiveauStockFindUnique.mockResolvedValue(null)
      mockProduitFindUnique.mockResolvedValue(mockProduct)
      mockEntrepotFindUnique.mockResolvedValue(null)

      const request = makeRequest('POST', '/api/v1/niveaux-stock', createBody)
      const response = await createStockLevelHandler(request)

      expect(response.status).toBe(404)
    })

    it('should return 400 for missing required fields', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)

      const request = makeRequest('POST', '/api/v1/niveaux-stock', { quantite_en_stock: 100 })
      const response = await createStockLevelHandler(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('PUT update', () => {
    const updateBody = { quantite_en_stock: 200 }

    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Invalid or missing API key'))

      const request = makeRequest('PUT', '/api/v1/niveaux-stock/1', updateBody)
      const response = await updateStockLevelHandler(request)

      expect(response.status).toBe(401)
    })

    it('should update a stock level', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockNiveauStockFindUnique.mockResolvedValue(mockStockLevel)
      mockNiveauStockUpdate.mockResolvedValue({ ...mockStockLevel, quantite_en_stock: 200 })

      const request = makeRequest('PUT', '/api/v1/niveaux-stock/1', updateBody)
      const response = await updateStockLevelHandler(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.quantite_en_stock).toBe(200)
      expect(mockNiveauStockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id_stock: 1 },
          data: expect.objectContaining({ quantite_en_stock: 200 }),
        })
      )
    })

    it('should return 404 for non-existent stock level', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockNiveauStockFindUnique.mockResolvedValue(null)

      const request = makeRequest('PUT', '/api/v1/niveaux-stock/999', updateBody)
      const response = await updateStockLevelHandler(request)

      expect(response.status).toBe(404)
    })

    it('should return 409 on duplicate produit-entrepot when changing both', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockNiveauStockFindUnique
        .mockResolvedValueOnce(mockStockLevel)
        .mockResolvedValueOnce({ ...mockStockLevel, id_stock: 2 })

      const request = makeRequest('PUT', '/api/v1/niveaux-stock/1', {
        id_produit: 2,
        id_entrepot: 2,
      })
      const response = await updateStockLevelHandler(request)

      expect(response.status).toBe(409)
    })

    it('should return 400 for invalid id', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)

      const request = makeRequest('PUT', '/api/v1/niveaux-stock/abc', updateBody)
      const response = await updateStockLevelHandler(request)

      expect(response.status).toBe(400)
    })
  })

  describe('DELETE', () => {
    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Invalid or missing API key'))

      const request = makeRequest('DELETE', '/api/v1/niveaux-stock/1')
      const response = await deleteStockLevelHandler(request)

      expect(response.status).toBe(401)
    })

    it('should hard-delete a stock level and return 204', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockNiveauStockFindUnique.mockResolvedValue(mockStockLevel)
      mockNiveauStockDelete.mockResolvedValue(mockStockLevel)

      const request = makeRequest('DELETE', '/api/v1/niveaux-stock/1')
      const response = await deleteStockLevelHandler(request)

      expect(response.status).toBe(204)
      expect(mockNiveauStockDelete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id_stock: 1 } })
      )
    })

    it('should return 404 for non-existent stock level', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockNiveauStockFindUnique.mockResolvedValue(null)

      const request = makeRequest('DELETE', '/api/v1/niveaux-stock/999')
      const response = await deleteStockLevelHandler(request)

      expect(response.status).toBe(404)
    })

    it('should return 400 for invalid id', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)

      const request = makeRequest('DELETE', '/api/v1/niveaux-stock/abc')
      const response = await deleteStockLevelHandler(request)

      expect(response.status).toBe(400)
    })
  })
})

describe('Rate Limiting', () => {
  it('should return 429 when rate limit exceeded', async () => {
    mockCacheIncrement.mockResolvedValue(31)
    mockRequireApiKey.mockResolvedValue({ userId: 'user-1', role: 'ADMIN' as const, keyId: 'key-1' })
    mockNiveauStockCreate.mockResolvedValue(mockStockLevel)
    mockNiveauStockFindUnique.mockResolvedValue(null)
    mockProduitFindUnique.mockResolvedValue(mockProduct)
    mockEntrepotFindUnique.mockResolvedValue(mockWarehouse)

    const { POST } = await import('@/app/api/v1/niveaux-stock/route')
    const request = makeRequest('POST', '/api/v1/niveaux-stock', {
      id_produit: 1,
      id_entrepot: 1,
      quantite_en_stock: 50,
    })

    const response = await POST(request)

    expect(response.status).toBe(429)
    const data = await response.json()
    expect(data.code).toBe('RATE_LIMIT_EXCEEDED')
  })
})
