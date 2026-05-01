import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockProduitFindMany, mockProduitCount, mockProduitFindUnique, mockProduitCreate, mockProduitUpdate, mockNiveauStockFindMany, mockNiveauStockCount, mockRequireApiKey, mockGetApiUser, mockCacheIncrement } = vi.hoisted(() => ({
  mockProduitFindMany: vi.fn(),
  mockProduitCount: vi.fn(),
  mockProduitFindUnique: vi.fn(),
  mockProduitCreate: vi.fn(),
  mockProduitUpdate: vi.fn(),
  mockNiveauStockFindMany: vi.fn(),
  mockNiveauStockCount: vi.fn(),
  mockRequireApiKey: vi.fn(),
  mockGetApiUser: vi.fn(),
  mockCacheIncrement: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    produit: {
      findMany: mockProduitFindMany,
      count: mockProduitCount,
      findUnique: mockProduitFindUnique,
      create: mockProduitCreate,
      update: mockProduitUpdate,
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
  id_categorie: null,
  famille: null,
  description_produit: null,
  code_barre_ean: null,
  unite_mesure: 'U',
  poids_kg: null,
  volume_m3: null,
  prix_achat: 100.00,
  prix_dernier_achat: 95.00,
  coefficient: 1.0,
  prix_vente: 150.00,
  prix_gros: 130.00,
  taux_tva: 20.00,
  type_suivi_stock: 'AUCUN',
  quantite_min_commande: 1,
  niveau_reappro_quantite: 0,
  stock_minimum: 0,
  stock_maximum: null,
  activer_suivi_stock: true,
  id_fournisseur_principal: null,
  reference_fournisseur: null,
  delai_livraison_fournisseur_jours: null,
  est_actif: true,
  en_sommeil: false,
  est_abandonne: false,
  date_creation: new Date('2025-01-01'),
  date_modification: new Date('2025-06-01'),
  cree_par: null,
  modifie_par: null,
  compte_general_vente: null,
  compte_general_achat: null,
  code_taxe_vente: null,
  code_taxe_achat: null,
}

const mockNiveauStock = {
  id_stock: 1,
  id_produit: 1,
  id_entrepot: 1,
  quantite_en_stock: 50,
  quantite_reservee: 5,
  quantite_commandee: 10,
  date_dernier_mouvement: new Date('2025-05-01'),
  type_dernier_mouvement: 'ENTREE',
  date_creation: new Date('2025-01-01'),
  date_modification: new Date('2025-06-01'),
  entrepot: {
    id_entrepot: 1,
    code_entrepot: 'WH-001',
    nom_entrepot: 'Entrepôt Principal',
  },
}

describe('Produit API Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCacheIncrement.mockResolvedValue(1)
  })

  describe('GET list', () => {
    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Invalid or missing API key'))

      const request = makeRequest('GET', '/api/v1/produits')
      const response = await listProductsHandler(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.code).toBe('AUTHENTICATION_ERROR')
    })

    it('should return paginated produits', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockProduitFindMany.mockResolvedValue([mockProduit])
      mockProduitCount.mockResolvedValue(1)

      const request = makeRequest('GET', '/api/v1/produits')
      const response = await listProductsHandler(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data).toHaveLength(1)
      expect(data.data[0].nom_produit).toBe('Produit Test')
      expect(data.meta.total).toBe(1)
      expect(data.meta.page).toBe(1)
    })

    it('should filter by famille', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockProduitFindMany.mockResolvedValue([{ ...mockProduit, famille: 'BIO' }])
      mockProduitCount.mockResolvedValue(1)

      const request = makeRequest('GET', '/api/v1/produits?famille=BIO')
      const response = await listProductsHandler(request)

      expect(response.status).toBe(200)
      expect(mockProduitFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ famille: 'BIO' }) })
      )
    })

    it('should filter by actif status', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockProduitFindMany.mockResolvedValue([mockProduit])
      mockProduitCount.mockResolvedValue(1)

      const request = makeRequest('GET', '/api/v1/produits?actif=true')
      const response = await listProductsHandler(request)

      expect(response.status).toBe(200)
      expect(mockProduitFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ est_actif: true }) })
      )
    })

    it('should search by nom_produit and code_produit', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockProduitFindMany.mockResolvedValue([mockProduit])
      mockProduitCount.mockResolvedValue(1)

      const request = makeRequest('GET', '/api/v1/produits?search=Test')
      const response = await listProductsHandler(request)

      expect(response.status).toBe(200)
      expect(mockProduitFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { nom_produit: { contains: 'Test', mode: 'insensitive' } },
              { code_produit: { contains: 'Test', mode: 'insensitive' } },
              { code_barre_ean: { contains: 'Test', mode: 'insensitive' } },
            ]),
          }),
        })
      )
    })

    it('should sort by specified field', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockProduitFindMany.mockResolvedValue([])
      mockProduitCount.mockResolvedValue(0)

      const request = makeRequest('GET', '/api/v1/produits?sort=prix_vente&order=desc')
      const response = await listProductsHandler(request)

      expect(response.status).toBe(200)
      expect(mockProduitFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { prix_vente: 'desc' } })
      )
    })

    it('should default to nom_produit for invalid sort field', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockProduitFindMany.mockResolvedValue([])
      mockProduitCount.mockResolvedValue(0)

      const request = makeRequest('GET', '/api/v1/produits?sort=invalid_field')
      const response = await listProductsHandler(request)

      expect(response.status).toBe(200)
      expect(mockProduitFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { nom_produit: 'asc' } })
      )
    })
  })

  describe('GET by id', () => {
    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Invalid or missing API key'))

      const request = makeRequest('GET', '/api/v1/produits/1')
      const response = await getProductByIdHandler(request)

      expect(response.status).toBe(401)
    })

    it('should return produit by id', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockProduitFindUnique.mockResolvedValue(mockProduit)

      const request = makeRequest('GET', '/api/v1/produits/1')
      const response = await getProductByIdHandler(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.nom_produit).toBe('Produit Test')
      expect(data.id_produit).toBe(1)
    })

    it('should return 404 for non-existent produit', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockProduitFindUnique.mockResolvedValue(null)

      const request = makeRequest('GET', '/api/v1/produits/999')
      const response = await getProductByIdHandler(request)

      expect(response.status).toBe(404)
    })

    it('should return 400 for invalid id', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)

      const request = makeRequest('GET', '/api/v1/produits/abc')
      const response = await getProductByIdHandler(request)

      expect(response.status).toBe(400)
    })
  })

  describe('POST create', () => {
    const createBody = {
      code_produit: 'PROD-002',
      nom_produit: 'New Product',
    }

    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Invalid or missing API key'))

      const request = makeRequest('POST', '/api/v1/produits', createBody)
      const response = await createProductHandler(request)

      expect(response.status).toBe(401)
    })

    it('should create a produit and return 201', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockProduitFindUnique.mockResolvedValue(null)
      mockProduitCreate.mockResolvedValue({ ...mockProduit, code_produit: 'PROD-002', nom_produit: 'New Product' })

      const request = makeRequest('POST', '/api/v1/produits', createBody)
      const response = await createProductHandler(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.nom_produit).toBe('New Product')
      expect(mockProduitCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            code_produit: 'PROD-002',
            nom_produit: 'New Product',
            cree_par: 'user-api-1',
          }),
        })
      )
    })

    it('should return 409 on duplicate code', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockProduitFindUnique.mockResolvedValue(mockProduit)

      const request = makeRequest('POST', '/api/v1/produits', { ...createBody, code_produit: 'PROD-001' })
      const response = await createProductHandler(request)

      expect(response.status).toBe(409)
    })

    it('should return 400 for missing required fields', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)

      const request = makeRequest('POST', '/api/v1/produits', { nom_produit: 'No Code' })
      const response = await createProductHandler(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.code).toBe('VALIDATION_ERROR')
    })

    it('should return 400 for invalid numeric value', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)

      const request = makeRequest('POST', '/api/v1/produits', {
        ...createBody,
        prix_vente: 'not-a-number',
      })
      const response = await createProductHandler(request)

      expect(response.status).toBe(400)
    })
  })

  describe('PUT update', () => {
    const updateBody = { nom_produit: 'Updated Product' }

    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Invalid or missing API key'))

      const request = makeRequest('PUT', '/api/v1/produits/1', updateBody)
      const response = await updateProductHandler(request)

      expect(response.status).toBe(401)
    })

    it('should update a produit', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockProduitFindUnique.mockResolvedValue(mockProduit)
      mockProduitUpdate.mockResolvedValue({ ...mockProduit, nom_produit: 'Updated Product' })

      const request = makeRequest('PUT', '/api/v1/produits/1', updateBody)
      const response = await updateProductHandler(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.nom_produit).toBe('Updated Product')
      expect(mockProduitUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id_produit: 1 },
          data: expect.objectContaining({
            nom_produit: 'Updated Product',
            modifie_par: 'user-api-1',
          }),
        })
      )
    })

    it('should return 404 for non-existent produit', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockProduitFindUnique.mockResolvedValue(null)

      const request = makeRequest('PUT', '/api/v1/produits/999', updateBody)
      const response = await updateProductHandler(request)

      expect(response.status).toBe(404)
    })

    it('should return 409 on duplicate code change', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockProduitFindUnique
        .mockResolvedValueOnce(mockProduit)
        .mockResolvedValueOnce({ ...mockProduit, id_produit: 2 })

      const request = makeRequest('PUT', '/api/v1/produits/1', { code_produit: 'PROD-999' })
      const response = await updateProductHandler(request)

      expect(response.status).toBe(409)
    })
  })

  describe('DELETE', () => {
    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Invalid or missing API key'))

      const request = makeRequest('DELETE', '/api/v1/produits/1')
      const response = await deleteProductHandler(request)

      expect(response.status).toBe(401)
    })

    it('should soft-delete a produit', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockGetApiUser.mockResolvedValue(API_USER)
      mockProduitFindUnique.mockResolvedValue(mockProduit)
      mockProduitUpdate.mockResolvedValue({ ...mockProduit, est_actif: false })

      const request = makeRequest('DELETE', '/api/v1/produits/1')
      const response = await deleteProductHandler(request)

      expect(response.status).toBe(204)
      expect(mockProduitUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id_produit: 1 },
          data: expect.objectContaining({ est_actif: false }),
        })
      )
    })

    it('should return 404 for non-existent produit', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockProduitFindUnique.mockResolvedValue(null)

      const request = makeRequest('DELETE', '/api/v1/produits/999')
      const response = await deleteProductHandler(request)

      expect(response.status).toBe(404)
    })
  })

  describe('GET stock levels', () => {
    it('should return product stock levels', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockProduitFindUnique.mockResolvedValue(mockProduit)
      mockNiveauStockFindMany.mockResolvedValue([mockNiveauStock])
      mockNiveauStockCount.mockResolvedValue(1)

      const request = makeRequest('GET', '/api/v1/produits/1/stock-levels')
      const response = await getProductStockLevelsHandler(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data).toHaveLength(1)
      expect(data.data[0].id_produit).toBe(1)
      expect(data.data[0].entrepot.code_entrepot).toBe('WH-001')
      expect(mockNiveauStockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id_produit: 1 },
          include: {
            entrepot: {
              select: {
                id_entrepot: true,
                code_entrepot: true,
                nom_entrepot: true,
              },
            },
          },
        })
      )
    })

    it('should return 404 for non-existent produit', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockProduitFindUnique.mockResolvedValue(null)

      const request = makeRequest('GET', '/api/v1/produits/999/stock-levels')
      const response = await getProductStockLevelsHandler(request)

      expect(response.status).toBe(404)
    })

    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Invalid or missing API key'))

      const request = makeRequest('GET', '/api/v1/produits/1/stock-levels')
      const response = await getProductStockLevelsHandler(request)

      expect(response.status).toBe(401)
    })
  })
})

describe('Rate Limiting', () => {
  it('should return 429 when rate limit exceeded', async () => {
    mockCacheIncrement.mockResolvedValue(31)
    mockRequireApiKey.mockResolvedValue({ userId: 'user-1', role: 'ADMIN' as const, keyId: 'key-1' })
    mockProduitCreate.mockResolvedValue(mockProduit)
    mockProduitFindUnique.mockResolvedValue(null)

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
