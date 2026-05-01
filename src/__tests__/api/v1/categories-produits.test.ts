import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockCategorieFindMany, mockCategorieCount, mockCategorieFindUnique, mockCategorieCreate, mockCategorieUpdate, mockCategorieDelete, mockProduitFindMany, mockProduitCount, mockRequireApiKey, mockCacheIncrement } = vi.hoisted(() => ({
  mockCategorieFindMany: vi.fn(),
  mockCategorieCount: vi.fn(),
  mockCategorieFindUnique: vi.fn(),
  mockCategorieCreate: vi.fn(),
  mockCategorieUpdate: vi.fn(),
  mockCategorieDelete: vi.fn(),
  mockProduitFindMany: vi.fn(),
  mockProduitCount: vi.fn(),
  mockRequireApiKey: vi.fn(),
  mockCacheIncrement: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    categorieProduit: {
      findMany: mockCategorieFindMany,
      count: mockCategorieCount,
      findUnique: mockCategorieFindUnique,
      create: mockCategorieCreate,
      update: mockCategorieUpdate,
      delete: mockCategorieDelete,
    },
    produit: {
      findMany: mockProduitFindMany,
      count: mockProduitCount,
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
  getApiUser: vi.fn(),
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
  listCategoriesHandler,
  getCategoryByIdHandler,
  createCategoryHandler,
  updateCategoryHandler,
  deleteCategoryHandler,
  getCategoryChildrenHandler,
  getCategoryProductsHandler,
} from '@/lib/api/handlers/categories-produits'
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

const mockCategory = {
  id_categorie: 1,
  code_categorie: 'CAT-001',
  nom_categorie: 'Catégorie Test',
  id_categorie_parent: null,
  description_categorie: null,
  est_actif: true,
  date_creation: new Date('2025-01-01'),
  date_modification: new Date('2025-06-01'),
}

describe('CategorieProduit API Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCacheIncrement.mockResolvedValue(1)
  })

  describe('GET list', () => {
    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Invalid or missing API key'))

      const request = makeRequest('GET', '/api/v1/categories-produits')
      const response = await listCategoriesHandler(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.code).toBe('AUTHENTICATION_ERROR')
    })

    it('should return paginated categories', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockCategorieFindMany.mockResolvedValue([mockCategory])
      mockCategorieCount.mockResolvedValue(1)

      const request = makeRequest('GET', '/api/v1/categories-produits')
      const response = await listCategoriesHandler(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data).toHaveLength(1)
      expect(data.data[0].nom_categorie).toBe('Catégorie Test')
      expect(data.meta.total).toBe(1)
      expect(data.meta.page).toBe(1)
    })

    it('should filter by parent=null (root categories)', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockCategorieFindMany.mockResolvedValue([mockCategory])
      mockCategorieCount.mockResolvedValue(1)

      const request = makeRequest('GET', '/api/v1/categories-produits?parent=null')
      const response = await listCategoriesHandler(request)

      expect(response.status).toBe(200)
      expect(mockCategorieFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id_categorie_parent: null } })
      )
    })

    it('should filter by specific parent id', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockCategorieFindMany.mockResolvedValue([])
      mockCategorieCount.mockResolvedValue(0)

      const request = makeRequest('GET', '/api/v1/categories-produits?parent=3')
      const response = await listCategoriesHandler(request)

      expect(response.status).toBe(200)
      expect(mockCategorieFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id_categorie_parent: 3 } })
      )
    })

    it('should search by nom_categorie and code_categorie', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockCategorieFindMany.mockResolvedValue([mockCategory])
      mockCategorieCount.mockResolvedValue(1)

      const request = makeRequest('GET', '/api/v1/categories-produits?search=Test')
      const response = await listCategoriesHandler(request)

      expect(response.status).toBe(200)
      expect(mockCategorieFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { nom_categorie: { contains: 'Test', mode: 'insensitive' } },
              { code_categorie: { contains: 'Test', mode: 'insensitive' } },
            ]),
          }),
        })
      )
    })

    it('should sort by specified field', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockCategorieFindMany.mockResolvedValue([])
      mockCategorieCount.mockResolvedValue(0)

      const request = makeRequest('GET', '/api/v1/categories-produits?sort=date_creation&order=desc')
      const response = await listCategoriesHandler(request)

      expect(response.status).toBe(200)
      expect(mockCategorieFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { date_creation: 'desc' } })
      )
    })

    it('should default to nom_categorie for invalid sort field', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockCategorieFindMany.mockResolvedValue([])
      mockCategorieCount.mockResolvedValue(0)

      const request = makeRequest('GET', '/api/v1/categories-produits?sort=invalid_field')
      const response = await listCategoriesHandler(request)

      expect(response.status).toBe(200)
      expect(mockCategorieFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { nom_categorie: 'asc' } })
      )
    })
  })

  describe('GET by id', () => {
    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Invalid or missing API key'))

      const request = makeRequest('GET', '/api/v1/categories-produits/1')
      const response = await getCategoryByIdHandler(request)

      expect(response.status).toBe(401)
    })

    it('should return category by id', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockCategorieFindUnique.mockResolvedValue(mockCategory)

      const request = makeRequest('GET', '/api/v1/categories-produits/1')
      const response = await getCategoryByIdHandler(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.nom_categorie).toBe('Catégorie Test')
      expect(data.id_categorie).toBe(1)
    })

    it('should return 404 for non-existent category', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockCategorieFindUnique.mockResolvedValue(null)

      const request = makeRequest('GET', '/api/v1/categories-produits/999')
      const response = await getCategoryByIdHandler(request)

      expect(response.status).toBe(404)
    })

    it('should return 400 for invalid id', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)

      const request = makeRequest('GET', '/api/v1/categories-produits/abc')
      const response = await getCategoryByIdHandler(request)

      expect(response.status).toBe(400)
    })
  })

  describe('POST create', () => {
    const createBody = {
      code_categorie: 'CAT-002',
      nom_categorie: 'New Category',
    }

    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Invalid or missing API key'))

      const request = makeRequest('POST', '/api/v1/categories-produits', createBody)
      const response = await createCategoryHandler(request)

      expect(response.status).toBe(401)
    })

    it('should create a category and return 201', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockCategorieFindUnique.mockResolvedValue(null)
      mockCategorieCreate.mockResolvedValue({ ...mockCategory, code_categorie: 'CAT-002', nom_categorie: 'New Category' })

      const request = makeRequest('POST', '/api/v1/categories-produits', createBody)
      const response = await createCategoryHandler(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.nom_categorie).toBe('New Category')
      expect(mockCategorieCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            code_categorie: 'CAT-002',
            nom_categorie: 'New Category',
          }),
        })
      )
    })

    it('should return 409 on duplicate code', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockCategorieFindUnique.mockResolvedValue(mockCategory)

      const request = makeRequest('POST', '/api/v1/categories-produits', { ...createBody, code_categorie: 'CAT-001' })
      const response = await createCategoryHandler(request)

      expect(response.status).toBe(409)
    })

    it('should return 400 for missing required fields', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)

      const request = makeRequest('POST', '/api/v1/categories-produits', { nom_categorie: 'No Code' })
      const response = await createCategoryHandler(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('PUT update', () => {
    const updateBody = { nom_categorie: 'Updated Category' }

    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Invalid or missing API key'))

      const request = makeRequest('PUT', '/api/v1/categories-produits/1', updateBody)
      const response = await updateCategoryHandler(request)

      expect(response.status).toBe(401)
    })

    it('should update a category', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockCategorieFindUnique.mockResolvedValue(mockCategory)
      mockCategorieUpdate.mockResolvedValue({ ...mockCategory, nom_categorie: 'Updated Category' })

      const request = makeRequest('PUT', '/api/v1/categories-produits/1', updateBody)
      const response = await updateCategoryHandler(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.nom_categorie).toBe('Updated Category')
      expect(mockCategorieUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id_categorie: 1 },
          data: expect.objectContaining({
            nom_categorie: 'Updated Category',
          }),
        })
      )
    })

    it('should return 404 for non-existent category', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockCategorieFindUnique.mockResolvedValue(null)

      const request = makeRequest('PUT', '/api/v1/categories-produits/999', updateBody)
      const response = await updateCategoryHandler(request)

      expect(response.status).toBe(404)
    })

    it('should return 409 on duplicate code change', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockCategorieFindUnique
        .mockResolvedValueOnce(mockCategory)
        .mockResolvedValueOnce({ ...mockCategory, id_categorie: 2 })

      const request = makeRequest('PUT', '/api/v1/categories-produits/1', { code_categorie: 'CAT-999' })
      const response = await updateCategoryHandler(request)

      expect(response.status).toBe(409)
    })

    it('should return 400 when setting id_categorie_parent to own id', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockCategorieFindUnique.mockResolvedValue(mockCategory)

      const request = makeRequest('PUT', '/api/v1/categories-produits/1', { id_categorie_parent: 1 })
      const response = await updateCategoryHandler(request)

      expect(response.status).toBe(400)
    })
  })

  describe('DELETE', () => {
    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Invalid or missing API key'))

      const request = makeRequest('DELETE', '/api/v1/categories-produits/1')
      const response = await deleteCategoryHandler(request)

      expect(response.status).toBe(401)
    })

    it('should hard-delete a category with no children', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockCategorieFindUnique.mockResolvedValue(mockCategory)
      mockCategorieCount.mockResolvedValue(0)
      mockCategorieDelete.mockResolvedValue(mockCategory)

      const request = makeRequest('DELETE', '/api/v1/categories-produits/1')
      const response = await deleteCategoryHandler(request)

      expect(response.status).toBe(204)
      expect(mockCategorieDelete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id_categorie: 1 } })
      )
    })

    it('should return 409 when category has children', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockCategorieFindUnique.mockResolvedValue(mockCategory)
      mockCategorieCount.mockResolvedValue(3)

      const request = makeRequest('DELETE', '/api/v1/categories-produits/1')
      const response = await deleteCategoryHandler(request)

      expect(response.status).toBe(409)
    })

    it('should return 404 for non-existent category', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockCategorieFindUnique.mockResolvedValue(null)

      const request = makeRequest('DELETE', '/api/v1/categories-produits/999')
      const response = await deleteCategoryHandler(request)

      expect(response.status).toBe(404)
    })
  })

  describe('GET children', () => {
    it('should return category children', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockCategorieFindUnique.mockResolvedValue(mockCategory)
      mockCategorieFindMany.mockResolvedValue([{ ...mockCategory, id_categorie: 2, nom_categorie: 'Child Category' }])
      mockCategorieCount.mockResolvedValue(1)

      const request = makeRequest('GET', '/api/v1/categories-produits/1/enfants')
      const response = await getCategoryChildrenHandler(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data).toHaveLength(1)
      expect(data.data[0].nom_categorie).toBe('Child Category')
    })

    it('should return 404 for non-existent parent category', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockCategorieFindUnique.mockResolvedValue(null)

      const request = makeRequest('GET', '/api/v1/categories-produits/999/enfants')
      const response = await getCategoryChildrenHandler(request)

      expect(response.status).toBe(404)
    })

    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Invalid or missing API key'))

      const request = makeRequest('GET', '/api/v1/categories-produits/1/enfants')
      const response = await getCategoryChildrenHandler(request)

      expect(response.status).toBe(401)
    })
  })

  describe('GET products', () => {
    it('should return category products', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockCategorieFindUnique.mockResolvedValue(mockCategory)
      mockProduitFindMany.mockResolvedValue([{ id_produit: 1, nom_produit: 'Produit A' }])
      mockProduitCount.mockResolvedValue(1)

      const request = makeRequest('GET', '/api/v1/categories-produits/1/produits')
      const response = await getCategoryProductsHandler(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data).toHaveLength(1)
      expect(data.data[0].nom_produit).toBe('Produit A')
    })

    it('should return 404 for non-existent category', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockCategorieFindUnique.mockResolvedValue(null)

      const request = makeRequest('GET', '/api/v1/categories-produits/999/produits')
      const response = await getCategoryProductsHandler(request)

      expect(response.status).toBe(404)
    })

    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Invalid or missing API key'))

      const request = makeRequest('GET', '/api/v1/categories-produits/1/produits')
      const response = await getCategoryProductsHandler(request)

      expect(response.status).toBe(401)
    })
  })
})

describe('Rate Limiting', () => {
  it('should return 429 when rate limit exceeded', async () => {
    mockCacheIncrement.mockResolvedValue(31)
    mockRequireApiKey.mockResolvedValue({ userId: 'user-1', role: 'ADMIN' as const, keyId: 'key-1' })
    mockCategorieCreate.mockResolvedValue(mockCategory)
    mockCategorieFindUnique.mockResolvedValue(null)

    const { POST } = await import('@/app/api/v1/categories-produits/route')
    const request = makeRequest('POST', '/api/v1/categories-produits', {
      code_categorie: 'CAT-RATE',
      nom_categorie: 'Rate Limit Test',
    })

    const response = await POST(request)

    expect(response.status).toBe(429)
    const data = await response.json()
    expect(data.code).toBe('RATE_LIMIT_EXCEEDED')
  })
})
