import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const {
  mockListArticles,
  mockGetArticleById,
  mockCreateArticle,
  mockUpdateArticle,
  mockDeleteArticle,
  mockGetStockLevelsByArticle,
  mockRequireApiKey,
  mockRedisIncr,
} = vi.hoisted(() => ({
  mockListArticles: vi.fn(),
  mockGetArticleById: vi.fn(),
  mockCreateArticle: vi.fn(),
  mockUpdateArticle: vi.fn(),
  mockDeleteArticle: vi.fn(),
  mockGetStockLevelsByArticle: vi.fn(),
  mockRequireApiKey: vi.fn(),
  mockRedisIncr: vi.fn(),
}))

vi.mock('@/lib/stock/stock-service', () => ({
  listArticles: mockListArticles,
  getArticleById: mockGetArticleById,
  createArticle: mockCreateArticle,
  updateArticle: mockUpdateArticle,
  deleteArticle: mockDeleteArticle,
  getStockLevelsByArticle: mockGetStockLevelsByArticle,
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
  listProductsHandler,
  getProductByIdHandler,
  createProductHandler,
  updateProductHandler,
  deleteProductHandler,
  getProductStockLevelsHandler,
} from '@/lib/api/handlers/produits'
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

const mockProduit = {
  id_produit: 1,
  code_produit: 'PROD-001',
  nom_produit: 'Produit Test',
  prix_vente: 150.00,
  prix_achat: 100.00,
  est_actif: true,
  en_sommeil: false,
  stock_global: 50,
  niveaux_stock: [],
  categorie: null,
}

const mockNiveauStock = {
  id_stock: 1,
  id_produit: 1,
  id_entrepot: 1,
  quantite_en_stock: 50,
  quantite_reservee: 5,
  date_creation: new Date('2025-01-01'),
  entrepot: {
    id_entrepot: 1,
    code_entrepot: 'WH-001',
    nom_entrepot: 'Entrepôt Principal',
  },
}

describe('Produit API Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRedisIncr.mockResolvedValue(1)
  })

  describe('GET list', () => {
    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Clé API invalide'))

      const request = makeRequest('GET', '/api/v1/produits')
      const response = await listProductsHandler(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.code).toBe('AUTHENTICATION_ERROR')
    })

    it('should return paginated produits', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockListArticles.mockResolvedValue({
        data: [mockProduit],
        meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
      })

      const request = makeRequest('GET', '/api/v1/produits')
      const response = await listProductsHandler(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data).toHaveLength(1)
      expect(data.data[0].nom_produit).toBe('Produit Test')
      expect(data.meta.total).toBe(1)
    })

    it('should pass search and filter params to service', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockListArticles.mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 50, total: 0, totalPages: 0 },
      })

      const request = makeRequest('GET', '/api/v1/produits?search=Test&famille=BIO')
      const response = await listProductsHandler(request)

      expect(response.status).toBe(200)
      expect(mockListArticles).toHaveBeenCalledWith(
        1, 50,
        expect.objectContaining({ search: 'Test', famille: 'BIO' }),
        undefined, 'asc'
      )
    })

    it('should pass sort params to service', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockListArticles.mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 50, total: 0, totalPages: 0 },
      })

      const request = makeRequest('GET', '/api/v1/produits?sort=prix_vente&order=desc')
      const response = await listProductsHandler(request)

      expect(response.status).toBe(200)
      expect(mockListArticles).toHaveBeenCalledWith(
        1, 50, {}, 'prix_vente', 'desc'
      )
    })
  })

  describe('GET by id', () => {
    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Clé API invalide'))

      const request = makeRequest('GET', '/api/v1/produits/1')
      const response = await getProductByIdHandler(request, 1)

      expect(response.status).toBe(401)
    })

    it('should return produit by id', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockGetArticleById.mockResolvedValue({ data: mockProduit })

      const request = makeRequest('GET', '/api/v1/produits/1')
      const response = await getProductByIdHandler(request, 1)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.nom_produit).toBe('Produit Test')
    })

    it('should return 404 for non-existent produit', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockGetArticleById.mockResolvedValue({ data: null, error: 'Article introuvable' })

      const request = makeRequest('GET', '/api/v1/produits/999')
      const response = await getProductByIdHandler(request, 999)

      expect(response.status).toBe(404)
    })

    it('should return 400 for invalid id', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)

      const request = makeRequest('GET', '/api/v1/produits/abc')
      const response = await getProductByIdHandler(request, NaN)

      expect(response.status).toBe(400)
    })
  })

  describe('POST create', () => {
    const createBody = {
      code_produit: 'PROD-002',
      nom_produit: 'New Product',
    }

    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Clé API invalide'))

      const request = makeRequest('POST', '/api/v1/produits', createBody)
      const response = await createProductHandler(request)

      expect(response.status).toBe(401)
    })

    it('should create a produit and return 201', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockCreateArticle.mockResolvedValue({ data: { ...mockProduit, code_produit: 'PROD-002', nom_produit: 'New Product' } })

      const request = makeRequest('POST', '/api/v1/produits', createBody)
      const response = await createProductHandler(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.nom_produit).toBe('New Product')
      expect(mockCreateArticle).toHaveBeenCalledWith(
        expect.objectContaining({
          code_produit: 'PROD-002',
          nom_produit: 'New Product',
        }),
        'user-api-1'
      )
    })

    it('should return 409 on duplicate code', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockCreateArticle.mockResolvedValue({ error: "L'article PROD-001 existe déjà" })

      const request = makeRequest('POST', '/api/v1/produits', { ...createBody, code_produit: 'PROD-001' })
      const response = await createProductHandler(request)

      expect(response.status).toBe(409)
    })

    it('should return 400 for missing required fields', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockCreateArticle.mockResolvedValue({ error: 'Validation échouée: requis' })

      const request = makeRequest('POST', '/api/v1/produits', { nom_produit: 'No Code' })
      const response = await createProductHandler(request)

      expect(response.status).toBe(400)
    })
  })

  describe('PUT update', () => {
    const updateBody = { nom_produit: 'Updated Product' }

    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Clé API invalide'))

      const request = makeRequest('PUT', '/api/v1/produits/1', updateBody)
      const response = await updateProductHandler(request, 1)

      expect(response.status).toBe(401)
    })

    it('should update a produit', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockUpdateArticle.mockResolvedValue({ data: { ...mockProduit, nom_produit: 'Updated Product' } })

      const request = makeRequest('PUT', '/api/v1/produits/1', updateBody)
      const response = await updateProductHandler(request, 1)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.nom_produit).toBe('Updated Product')
    })

    it('should return 404 for non-existent produit', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockUpdateArticle.mockResolvedValue({ error: 'Article introuvable' })

      const request = makeRequest('PUT', '/api/v1/produits/999', updateBody)
      const response = await updateProductHandler(request, 999)

      expect(response.status).toBe(404)
    })

    it('should return 409 on duplicate code', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockUpdateArticle.mockResolvedValue({ error: "L'article PROD-999 existe déjà" })

      const request = makeRequest('PUT', '/api/v1/produits/1', { code_produit: 'PROD-999' })
      const response = await updateProductHandler(request, 1)

      expect(response.status).toBe(409)
    })
  })

  describe('DELETE', () => {
    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Clé API invalide'))

      const request = makeRequest('DELETE', '/api/v1/produits/1')
      const response = await deleteProductHandler(request, 1)

      expect(response.status).toBe(401)
    })

    it('should soft-delete a produit', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockDeleteArticle.mockResolvedValue({ data: { success: true } })

      const request = makeRequest('DELETE', '/api/v1/produits/1')
      const response = await deleteProductHandler(request, 1)

      expect(response.status).toBe(204)
    })

    it('should return 404 for non-existent produit', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockDeleteArticle.mockResolvedValue({ error: 'Article introuvable' })

      const request = makeRequest('DELETE', '/api/v1/produits/999')
      const response = await deleteProductHandler(request, 999)

      expect(response.status).toBe(404)
    })
  })

  describe('GET stock levels', () => {
    it('should return product stock levels', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockGetStockLevelsByArticle.mockResolvedValue({
        data: [mockNiveauStock],
        meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
      })

      const request = makeRequest('GET', '/api/v1/produits/1/stock-levels')
      const response = await getProductStockLevelsHandler(request, 1)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data).toHaveLength(1)
      expect(data.data[0].id_produit).toBe(1)
      expect(data.data[0].entrepot.code_entrepot).toBe('WH-001')
    })

    it('should return 404 for non-existent produit', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockGetStockLevelsByArticle.mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 50, total: 0, totalPages: 0 },
        error: 'Article introuvable',
      })

      const request = makeRequest('GET', '/api/v1/produits/999/stock-levels')
      const response = await getProductStockLevelsHandler(request, 999)

      expect(response.status).toBe(404)
    })

    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Clé API invalide'))

      const request = makeRequest('GET', '/api/v1/produits/1/stock-levels')
      const response = await getProductStockLevelsHandler(request, 1)

      expect(response.status).toBe(401)
    })
  })
})

describe('Rate Limiting', () => {
  it('should return 429 when rate limit exceeded', async () => {
    mockRedisIncr.mockResolvedValue(31)
    mockRequireApiKey.mockResolvedValue({ userId: 'user-1', role: 'ADMIN' as const, keyId: 'key-1' })
    mockCreateArticle.mockResolvedValue({ data: mockProduit })

    const { POST } = await import('@/app/api/v1/produits/route')
    const request = makeRequest('POST', '/api/v1/produits', {
      code_produit: 'PROD-RATE',
      nom_produit: 'Rate Limit Test',
    })

    const response = await POST(request)

    expect(response.status).toBe(429)
    const data = await response.json()
    expect(data.code).toBe('RATE_LIMIT_EXCEEDED')
  })
})
