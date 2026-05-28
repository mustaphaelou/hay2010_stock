import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const {
  mockNiveauStockFindMany,
  mockNiveauStockCount,
  mockNiveauStockFindUnique,
  mockNiveauStockCreate,
  mockNiveauStockUpdate,
  mockNiveauStockDelete,
  mockProduitFindUnique,
  mockEntrepotFindUnique,
  mockRequireApiKey,
  mockRedisIncr,
  mockCreateStockLevel,
  mockAdjustStockLevel,
  mockDeleteStockLevel,
} = vi.hoisted(() => ({
  mockNiveauStockFindMany: vi.fn(),
  mockNiveauStockCount: vi.fn(),
  mockNiveauStockFindUnique: vi.fn(),
  mockNiveauStockCreate: vi.fn(),
  mockNiveauStockUpdate: vi.fn(),
  mockNiveauStockDelete: vi.fn(),
  mockProduitFindUnique: vi.fn(),
  mockEntrepotFindUnique: vi.fn(),
  mockRequireApiKey: vi.fn(),
  mockRedisIncr: vi.fn(),
  mockCreateStockLevel: vi.fn(),
  mockAdjustStockLevel: vi.fn(),
  mockDeleteStockLevel: vi.fn(),
}))

vi.mock('next/server', async (importOriginal) => {
  const mod = await importOriginal<typeof import('next/server')>()
  return { ...mod, after: vi.fn((fn: () => void | Promise<void>) => fn()) }
})

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

vi.mock('@/lib/stock/stock-service', () => ({
  createStockLevel: mockCreateStockLevel,
  adjustStockLevel: mockAdjustStockLevel,
  deleteStockLevel: mockDeleteStockLevel,
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
  adjustStockLevelHandler,
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

const mockStockLevelResult = {
  id_stock: 1,
  id_produit: 1,
  id_entrepot: 1,
  quantite_en_stock: 100,
  quantite_reservee: 0,
  quantite_commandee: 0,
}

describe('NiveauStock API Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRedisIncr.mockResolvedValue(1)
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
      expect(data.meta.total).toBe(1)
    })

    it('should filter by produit query param', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockNiveauStockFindMany.mockResolvedValue([mockStockLevelWithRelations])
      mockNiveauStockCount.mockResolvedValue(1)

      const request = makeRequest('GET', '/api/v1/niveaux-stock?produit=1')
      const response = await listStockLevelsHandler(request)

      expect(response.status).toBe(200)
      expect(mockNiveauStockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id_produit: 1 },
        })
      )
    })

    it('should filter by entrepot query param', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockNiveauStockFindMany.mockResolvedValue([mockStockLevelWithRelations])
      mockNiveauStockCount.mockResolvedValue(1)

      const request = makeRequest('GET', '/api/v1/niveaux-stock?entrepot=1')
      const response = await listStockLevelsHandler(request)

      expect(response.status).toBe(200)
      expect(mockNiveauStockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id_entrepot: 1 },
        })
      )
    })

    it('should return empty list when no results', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockNiveauStockFindMany.mockResolvedValue([])
      mockNiveauStockCount.mockResolvedValue(0)

      const request = makeRequest('GET', '/api/v1/niveaux-stock')
      const response = await listStockLevelsHandler(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data).toHaveLength(0)
      expect(data.meta.total).toBe(0)
    })
  })

  describe('GET by id', () => {
    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Invalid or missing API key'))

      const request = makeRequest('GET', '/api/v1/niveaux-stock/1')
      const response = await getStockLevelByIdHandler(request)

      expect(response.status).toBe(401)
    })

    it('should return a single stock level with related data', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockNiveauStockFindUnique.mockResolvedValue(mockStockLevelWithRelations)

      const request = makeRequest('GET', '/api/v1/niveaux-stock/1')
      const response = await getStockLevelByIdHandler(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.id_stock).toBe(1)
      expect(data.produit).toBeDefined()
      expect(data.entrepot).toBeDefined()
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
      productId: 1,
      warehouseId: 1,
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
      mockCreateStockLevel.mockResolvedValue({ data: mockStockLevelResult })

      const request = makeRequest('POST', '/api/v1/niveaux-stock', createBody)
      const response = await createStockLevelHandler(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.id_stock).toBe(1)
      expect(mockCreateStockLevel).toHaveBeenCalledWith(createBody, API_USER.userId)
    })

    it('should return 409 on duplicate produit-entrepot', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockCreateStockLevel.mockResolvedValue({ error: 'Un niveau de stock existe déjà pour ce couple produit-entrepôt', code: 'CONFLICT' })

      const request = makeRequest('POST', '/api/v1/niveaux-stock', createBody)
      const response = await createStockLevelHandler(request)

      expect(response.status).toBe(409)
    })

    it('should return 404 when produit not found', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockCreateStockLevel.mockResolvedValue({ error: 'Produit introuvable', code: 'NOT_FOUND' })

      const request = makeRequest('POST', '/api/v1/niveaux-stock', createBody)
      const response = await createStockLevelHandler(request)

      expect(response.status).toBe(404)
    })

    it('should return 404 when entrepot not found', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockCreateStockLevel.mockResolvedValue({ error: 'Entrepôt introuvable', code: 'NOT_FOUND' })

      const request = makeRequest('POST', '/api/v1/niveaux-stock', createBody)
      const response = await createStockLevelHandler(request)

      expect(response.status).toBe(404)
    })
  })

  describe('PUT adjust', () => {
    const adjustBody = { productId: 1, warehouseId: 1, newQuantity: 200 }

    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Invalid or missing API key'))

      const request = makeRequest('PUT', '/api/v1/niveaux-stock/1', adjustBody)
      const response = await adjustStockLevelHandler(request)

      expect(response.status).toBe(401)
    })

    it('should adjust a stock level', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockAdjustStockLevel.mockResolvedValue({
        data: { previousQuantity: 100, newQuantity: 200, delta: 100 },
      })

      const request = makeRequest('PUT', '/api/v1/niveaux-stock/1', adjustBody)
      const response = await adjustStockLevelHandler(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.previousQuantity).toBe(100)
      expect(data.newQuantity).toBe(200)
      expect(mockAdjustStockLevel).toHaveBeenCalledWith(adjustBody, API_USER.userId)
    })

    it('should return error from service', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockAdjustStockLevel.mockResolvedValue({ error: 'Stock operation in progress, please retry' })

      const request = makeRequest('PUT', '/api/v1/niveaux-stock/1', adjustBody)
      const response = await adjustStockLevelHandler(request)

      expect(response.status).toBe(422)
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
      mockDeleteStockLevel.mockResolvedValue({})

      const request = makeRequest('DELETE', '/api/v1/niveaux-stock/1')
      const response = await deleteStockLevelHandler(request)

      expect(response.status).toBe(204)
      expect(mockDeleteStockLevel).toHaveBeenCalledWith(1)
    })

    it('should return 404 for non-existent stock level', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockDeleteStockLevel.mockResolvedValue({ error: 'Niveau de stock introuvable', code: 'NOT_FOUND' })

      const request = makeRequest('DELETE', '/api/v1/niveaux-stock/999')
      const response = await deleteStockLevelHandler(request)

      expect(response.status).toBe(404)
    })

    it('should reject delete when quantity is not zero', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockDeleteStockLevel.mockResolvedValue({ error: 'Impossible de supprimer un niveau de stock dont la quantité n\'est pas à zéro' })

      const request = makeRequest('DELETE', '/api/v1/niveaux-stock/1')
      const response = await deleteStockLevelHandler(request)

      expect(response.status).toBe(422)
    })
  })
})