import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockDocVenteFindMany, mockDocVenteCount, mockDocVenteFindUnique, mockDocVenteCreate, mockDocVenteUpdate, mockLigneDocumentFindMany, mockLigneDocumentCount, mockPartenaireFindUnique, mockRequireApiKey, mockGetApiUser, mockCacheIncrement } = vi.hoisted(() => ({
  mockDocVenteFindMany: vi.fn(),
  mockDocVenteCount: vi.fn(),
  mockDocVenteFindUnique: vi.fn(),
  mockDocVenteCreate: vi.fn(),
  mockDocVenteUpdate: vi.fn(),
  mockLigneDocumentFindMany: vi.fn(),
  mockLigneDocumentCount: vi.fn(),
  mockPartenaireFindUnique: vi.fn(),
  mockRequireApiKey: vi.fn(),
  mockGetApiUser: vi.fn(),
  mockCacheIncrement: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    docVente: {
      findMany: mockDocVenteFindMany,
      count: mockDocVenteCount,
      findUnique: mockDocVenteFindUnique,
      create: mockDocVenteCreate,
      update: mockDocVenteUpdate,
    },
    ligneDocument: {
      findMany: mockLigneDocumentFindMany,
      count: mockLigneDocumentCount,
    },
    partenaire: {
      findUnique: mockPartenaireFindUnique,
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
  listDocumentsHandler,
  getDocumentByIdHandler,
  createDocumentHandler,
  updateDocumentHandler,
  deleteDocumentHandler,
  getDocumentLinesHandler,
} from '@/lib/api/handlers/documents'
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

const mockDocument = {
  id_document: 1,
  numero_document: 'FAC-001',
  type_document: 'Facture',
  domaine_document: 'VENTE',
  etat_document: 'Saisi',
  id_partenaire: 1,
  nom_partenaire_snapshot: null,
  id_affaire: null,
  numero_affaire: null,
  date_document: new Date('2025-01-01'),
  date_echeance: null,
  date_livraison: null,
  date_livraison_prevue: null,
  montant_ht: 1000.00,
  montant_remise_total: 0,
  montant_tva_total: 200.00,
  montant_ttc: 1200.00,
  solde_du: 0,
  code_devise: 'MAD',
  taux_change: 1,
  statut_document: 'BROUILLON',
  est_entierement_paye: false,
  id_entrepot: null,
  notes_internes: null,
  notes_client: null,
  reference_externe: null,
  date_creation: new Date('2025-01-01'),
  date_modification: new Date('2025-06-01'),
  cree_par: null,
  modifie_par: null,
  mode_expedition: null,
  poids_total_brut: null,
  nombre_colis: null,
}

const mockDocumentLine = {
  id_ligne: 1,
  id_document: 1,
  numero_ligne: 1,
  id_produit: 1,
  code_produit_snapshot: 'PROD-001',
  nom_produit_snapshot: 'Product 1',
  quantite_commandee: 5,
  quantite_livree: 0,
  prix_unitaire_ht: 100,
  montant_ht: 500,
  montant_tva: 100,
  montant_ttc: 600,
}

const mockPartenaire = {
  id_partenaire: 1,
  code_partenaire: 'P-001',
  nom_partenaire: 'Client Alpha',
  type_partenaire: 'CLIENT',
  adresse_email: 'alpha@test.com',
  est_actif: true,
}

describe('Document API Handlers', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockCacheIncrement.mockResolvedValue(1)
    mockRequireApiKey.mockResolvedValue(API_USER)
    mockGetApiUser.mockResolvedValue(API_USER)
    mockDocVenteFindUnique.mockResolvedValue(mockDocument)
    mockDocVenteCreate.mockResolvedValue(mockDocument)
    mockDocVenteUpdate.mockResolvedValue(mockDocument)
    mockDocVenteFindMany.mockResolvedValue([mockDocument])
    mockDocVenteCount.mockResolvedValue(1)
    mockPartenaireFindUnique.mockResolvedValue(mockPartenaire)
    mockLigneDocumentFindMany.mockResolvedValue([mockDocumentLine])
    mockLigneDocumentCount.mockResolvedValue(1)
  })

  describe('GET list', () => {
    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Invalid or missing API key'))

      const request = makeRequest('GET', '/api/v1/documents')
      const response = await listDocumentsHandler(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.code).toBe('AUTHENTICATION_ERROR')
    })

    it('should return paginated documents', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockDocVenteFindMany.mockResolvedValue([mockDocument])
      mockDocVenteCount.mockResolvedValue(1)

      const request = makeRequest('GET', '/api/v1/documents')
      const response = await listDocumentsHandler(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data).toHaveLength(1)
      expect(data.data[0].numero_document).toBe('FAC-001')
      expect(data.meta.total).toBe(1)
      expect(data.meta.page).toBe(1)
    })

    it('should filter by type_document', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockDocVenteFindMany.mockResolvedValue([{ ...mockDocument, type_document: 'BL' }])
      mockDocVenteCount.mockResolvedValue(1)

      const request = makeRequest('GET', '/api/v1/documents?type_document=BL')
      const response = await listDocumentsHandler(request)

      expect(response.status).toBe(200)
      expect(mockDocVenteFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ type_document: 'BL' }) })
      )
    })

    it('should filter by domaine_document', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockDocVenteFindMany.mockResolvedValue([{ ...mockDocument, domaine_document: 'ACHAT' }])
      mockDocVenteCount.mockResolvedValue(1)

      const request = makeRequest('GET', '/api/v1/documents?domaine_document=ACHAT')
      const response = await listDocumentsHandler(request)

      expect(response.status).toBe(200)
      expect(mockDocVenteFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ domaine_document: 'ACHAT' }) })
      )
    })

    it('should filter by statut_document', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockDocVenteFindMany.mockResolvedValue([{ ...mockDocument, statut_document: 'VALIDE' }])
      mockDocVenteCount.mockResolvedValue(1)

      const request = makeRequest('GET', '/api/v1/documents?statut_document=VALIDE')
      const response = await listDocumentsHandler(request)

      expect(response.status).toBe(200)
      expect(mockDocVenteFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ statut_document: 'VALIDE' }) })
      )
    })

    it('should filter by id_partenaire', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockDocVenteFindMany.mockResolvedValue([mockDocument])
      mockDocVenteCount.mockResolvedValue(1)

      const request = makeRequest('GET', '/api/v1/documents?id_partenaire=1')
      const response = await listDocumentsHandler(request)

      expect(response.status).toBe(200)
      expect(mockDocVenteFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id_partenaire: 1 }) })
      )
    })

    it('should search by numero_document', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockDocVenteFindMany.mockResolvedValue([mockDocument])
      mockDocVenteCount.mockResolvedValue(1)

      const request = makeRequest('GET', '/api/v1/documents?search=FAC')
      const response = await listDocumentsHandler(request)

      expect(response.status).toBe(200)
      expect(mockDocVenteFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { numero_document: { contains: 'FAC', mode: 'insensitive' } },
              { nom_partenaire_snapshot: { contains: 'FAC', mode: 'insensitive' } },
              { reference_externe: { contains: 'FAC', mode: 'insensitive' } },
            ]),
          }),
        })
      )
    })

    it('should sort by specified field', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockDocVenteFindMany.mockResolvedValue([])
      mockDocVenteCount.mockResolvedValue(0)

      const request = makeRequest('GET', '/api/v1/documents?sort=date_document&order=desc')
      const response = await listDocumentsHandler(request)

      expect(response.status).toBe(200)
      expect(mockDocVenteFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { date_document: 'desc' } })
      )
    })

    it('should default to date_document for invalid sort field', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockDocVenteFindMany.mockResolvedValue([])
      mockDocVenteCount.mockResolvedValue(0)

      const request = makeRequest('GET', '/api/v1/documents?sort=invalid_field')
      const response = await listDocumentsHandler(request)

      expect(response.status).toBe(200)
      expect(mockDocVenteFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { date_document: 'desc' } })
      )
    })
  })

  describe('GET by id', () => {
    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Invalid or missing API key'))

      const request = makeRequest('GET', '/api/v1/documents/1')
      const response = await getDocumentByIdHandler(request)

      expect(response.status).toBe(401)
    })

    it('should return document by id with lignes and partenaire', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockDocVenteFindUnique.mockResolvedValue({
        ...mockDocument,
        lignes: [mockDocumentLine],
        partenaire: mockPartenaire,
      })

      const request = makeRequest('GET', '/api/v1/documents/1')
      const response = await getDocumentByIdHandler(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.numero_document).toBe('FAC-001')
      expect(data.id_document).toBe(1)
      expect(data.lignes).toHaveLength(1)
      expect(data.partenaire).toBeDefined()
    })

    it('should return 404 for non-existent document', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockDocVenteFindUnique.mockResolvedValue(null)

      const request = makeRequest('GET', '/api/v1/documents/999')
      const response = await getDocumentByIdHandler(request)

      expect(response.status).toBe(404)
    })

    it('should return 400 for invalid id', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)

      const request = makeRequest('GET', '/api/v1/documents/abc')
      const response = await getDocumentByIdHandler(request)

      expect(response.status).toBe(400)
    })
  })

  describe('POST create', () => {
    const createBody = {
      numero_document: 'FAC-002',
      type_document: 'Facture',
      domaine_document: 'VENTE',
      id_partenaire: 1,
      date_document: '2025-03-01',
      code_devise: 'MAD',
      montant_ht: 500.00,
    }

    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Invalid or missing API key'))

      const request = makeRequest('POST', '/api/v1/documents', createBody)
      const response = await createDocumentHandler(request)

      expect(response.status).toBe(401)
    })

    it('should create a document and return 201', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockDocVenteFindUnique.mockResolvedValue(null)
      mockPartenaireFindUnique.mockResolvedValue(mockPartenaire)
      mockDocVenteCreate.mockResolvedValue({
        ...mockDocument,
        numero_document: 'FAC-002',
        montant_ht: 500.00,
        lignes: [],
        partenaire: mockPartenaire,
      })

      const request = makeRequest('POST', '/api/v1/documents', createBody)
      const response = await createDocumentHandler(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.numero_document).toBe('FAC-002')
      expect(mockDocVenteCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            numero_document: 'FAC-002',
            type_document: 'Facture',
            id_partenaire: 1,
            cree_par: 'user-api-1',
            date_document: expect.any(Date),
          }),
        })
      )
    })

    it('should return 409 on duplicate numero_document', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockDocVenteFindUnique.mockResolvedValue(mockDocument)

      const request = makeRequest('POST', '/api/v1/documents', { ...createBody, numero_document: 'FAC-001' })
      const response = await createDocumentHandler(request)

      expect(response.status).toBe(409)
    })

    it('should return 404 when id_partenaire does not exist', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockDocVenteFindUnique.mockResolvedValue(null)
      mockPartenaireFindUnique.mockResolvedValue(null)

      const request = makeRequest('POST', '/api/v1/documents', { ...createBody, id_partenaire: 999 })
      const response = await createDocumentHandler(request)

      expect(response.status).toBe(404)
    })

    it('should return 400 for missing required fields', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)

      const request = makeRequest('POST', '/api/v1/documents', { numero_document: 'No Date' })
      const response = await createDocumentHandler(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.code).toBe('VALIDATION_ERROR')
    })

    it('should convert date strings to Date objects', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockDocVenteFindUnique.mockResolvedValue(null)
      mockPartenaireFindUnique.mockResolvedValue(mockPartenaire)
      mockDocVenteCreate.mockResolvedValue({
        ...mockDocument,
        lignes: [],
        partenaire: mockPartenaire,
      })

      const request = makeRequest('POST', '/api/v1/documents', {
        ...createBody,
        date_echeance: '2025-04-01',
        date_livraison: '2025-03-15',
        date_livraison_prevue: '2025-03-10',
      })
      const response = await createDocumentHandler(request)

      expect(response.status).toBe(201)
      expect(mockDocVenteCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            date_echeance: expect.any(Date),
            date_livraison: expect.any(Date),
            date_livraison_prevue: expect.any(Date),
          }),
        })
      )
    })
  })

  describe('PUT update', () => {
    const updateBody = { numero_document: 'FAC-001-UPD', montant_ht: 1500.00 }

    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Invalid or missing API key'))

      const request = makeRequest('PUT', '/api/v1/documents/1', updateBody)
      const response = await updateDocumentHandler(request)

      expect(response.status).toBe(401)
    })

    it('should update a document', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockDocVenteFindUnique
        .mockResolvedValueOnce(mockDocument)
        .mockResolvedValueOnce(null)
      mockDocVenteUpdate.mockResolvedValue({
        ...mockDocument,
        numero_document: 'FAC-001-UPD',
        montant_ht: 1500.00,
      })

      const request = makeRequest('PUT', '/api/v1/documents/1', updateBody)
      const response = await updateDocumentHandler(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.numero_document).toBe('FAC-001-UPD')
      expect(mockDocVenteUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id_document: 1 },
          data: expect.objectContaining({
            numero_document: 'FAC-001-UPD',
            modifie_par: 'user-api-1',
          }),
        })
      )
    })

    it('should return 404 for non-existent document', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockDocVenteFindUnique.mockResolvedValue(null)

      const request = makeRequest('PUT', '/api/v1/documents/999', updateBody)
      const response = await updateDocumentHandler(request)

      expect(response.status).toBe(404)
    })

    it('should return 409 on duplicate numero_document change', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockDocVenteFindUnique
        .mockResolvedValueOnce(mockDocument)
        .mockResolvedValueOnce({ ...mockDocument, id_document: 2 })

      const request = makeRequest('PUT', '/api/v1/documents/1', { numero_document: 'FAC-999' })
      const response = await updateDocumentHandler(request)

      expect(response.status).toBe(409)
    })

    it('should convert date strings to Date objects on update', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockDocVenteFindUnique
        .mockResolvedValueOnce(mockDocument)
        .mockResolvedValueOnce(null)
      mockDocVenteUpdate.mockResolvedValue(mockDocument)

      const request = makeRequest('PUT', '/api/v1/documents/1', {
        date_document: '2025-07-01',
        date_echeance: '2025-08-01',
      })
      const response = await updateDocumentHandler(request)

      expect(response.status).toBe(200)
      expect(mockDocVenteUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            date_document: expect.any(Date),
            date_echeance: expect.any(Date),
          }),
        })
      )
    })
  })

  describe('DELETE', () => {
    it('should return 401 without API key', async () => {
      mockRequireApiKey.mockRejectedValue(new AuthenticationError('Invalid or missing API key'))

      const request = makeRequest('DELETE', '/api/v1/documents/1')
      const response = await deleteDocumentHandler(request)

      expect(response.status).toBe(401)
    })

    it('should set statut_document to ANNULE', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockGetApiUser.mockResolvedValue(API_USER)
      mockDocVenteFindUnique.mockResolvedValue(mockDocument)
      mockDocVenteUpdate.mockResolvedValue({ ...mockDocument, statut_document: 'ANNULE' })

      const request = makeRequest('DELETE', '/api/v1/documents/1')
      const response = await deleteDocumentHandler(request)

      expect(response.status).toBe(204)
      expect(mockDocVenteUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id_document: 1 },
          data: expect.objectContaining({ statut_document: 'ANNULE' }),
        })
      )
    })

    it('should return 404 for non-existent document', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockDocVenteFindUnique.mockResolvedValue(null)

      const request = makeRequest('DELETE', '/api/v1/documents/999')
      const response = await deleteDocumentHandler(request)

      expect(response.status).toBe(404)
    })
  })

  describe('GET lines', () => {
    it('should return document lines', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockDocVenteFindUnique.mockResolvedValue(mockDocument)
      mockLigneDocumentFindMany.mockResolvedValue([mockDocumentLine])
      mockLigneDocumentCount.mockResolvedValue(1)

      const request = makeRequest('GET', '/api/v1/documents/1/lines')
      const response = await getDocumentLinesHandler(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data).toHaveLength(1)
      expect(data.data[0].id_ligne).toBe(1)
      expect(data.data[0].code_produit_snapshot).toBe('PROD-001')
    })

    it('should return 404 for non-existent document', async () => {
      mockRequireApiKey.mockResolvedValue(API_USER)
      mockDocVenteFindUnique.mockResolvedValue(null)

      const request = makeRequest('GET', '/api/v1/documents/999/lines')
      const response = await getDocumentLinesHandler(request)

      expect(response.status).toBe(404)
    })
  })
})

describe('Rate Limiting', () => {
  it('should return 429 when rate limit exceeded', async () => {
    mockCacheIncrement.mockResolvedValue(31)
    mockRequireApiKey.mockResolvedValue({ userId: 'user-1', role: 'ADMIN' as const, keyId: 'key-1' })
    mockDocVenteCreate.mockResolvedValue(mockDocument)
    mockDocVenteFindUnique.mockResolvedValue(null)
    mockPartenaireFindUnique.mockResolvedValue(mockPartenaire)

    const { POST } = await import('@/app/api/v1/documents/route')
    const request = makeRequest('POST', '/api/v1/documents', {
      numero_document: 'FAC-RATE',
      type_document: 'Facture',
      domaine_document: 'VENTE',
      id_partenaire: 1,
      date_document: '2025-01-01',
      code_devise: 'MAD',
      montant_ht: 100,
    })

    const response = await POST(request)

    expect(response.status).toBe(429)
    const data = await response.json()
    expect(data.code).toBe('RATE_LIMIT_EXCEEDED')
  })
})
