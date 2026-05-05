import { describe, it, expect, beforeEach, vi } from 'vitest'

const { mockRequireAuth } = vi.hoisted(() => ({
  mockRequireAuth: vi.fn().mockResolvedValue({ id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' }),
}))

const { mockProduitFindMany, mockPartenaireFindMany, mockDocVenteFindMany, mockLigneDocumentFindMany } = vi.hoisted(() => ({
  mockProduitFindMany: vi.fn(),
  mockPartenaireFindMany: vi.fn(),
  mockDocVenteFindMany: vi.fn(),
  mockLigneDocumentFindMany: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    produit: { findMany: mockProduitFindMany },
    partenaire: { findMany: mockPartenaireFindMany },
    docVente: { findMany: mockDocVenteFindMany },
    ligneDocument: { findMany: mockLigneDocumentFindMany },
  },
}))

vi.mock('@/lib/auth/user-utils', () => ({
  requireAuth: mockRequireAuth,
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

import { getDashboardData } from '@/app/actions/dashboard-data'

describe('Dashboard Data Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAuth.mockResolvedValue({ id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' })
  })

  describe('getDashboardData', () => {
    it('should require authentication', async () => {
      mockRequireAuth.mockRejectedValue(new Error('Unauthorized'))

      await expect(getDashboardData()).rejects.toThrow('Unauthorized')
    })

    it('should return { data, error?: undefined } with all data categories', async () => {
      mockProduitFindMany.mockResolvedValue([
        { id_produit: 1, code_produit: 'P001', nom_produit: 'Product A', prix_vente: 100, prix_achat: 50, stock_maximum: 500, niveau_reappro_quantite: 10, categorie: { nom_categorie: 'Cat A' } },
      ])
      mockPartenaireFindMany.mockResolvedValue([
        { id_partenaire: 1, code_partenaire: 'PART-001', nom_partenaire: 'Partner A', type_partenaire: 'CLIENT', ville: 'Paris', est_actif: true },
      ])
      mockDocVenteFindMany.mockResolvedValue([
        {
          id_document: 1,
          numero_document: 'DOC-001',
          date_document: new Date(),
          type_document: 'Facture',
          domaine_document: 'VENTE',
          montant_ttc: 1200,
          montant_ht: 1000,
          statut_document: 'CONFIRMED',
          nom_partenaire_snapshot: 'Partner A',
          partenaire: { nom_partenaire: 'Partner A' },
        },
      ])
      mockLigneDocumentFindMany.mockResolvedValue([
        {
          id_ligne: 1,
          quantite_livree: 10,
          numero_ligne: 1,
          produit: { nom_produit: 'Product A', code_produit: 'P001' },
          document: { numero_document: 'DOC-001', date_document: new Date(), type_document: 'FACTURE' },
        },
      ])

      const result = await getDashboardData()

      expect(result.data).toBeDefined()
      expect(result.data?.products).toHaveLength(1)
      expect(result.data?.products[0].prix_vente).toBe(100)
      expect(result.data?.partners).toHaveLength(1)
      expect(result.data?.documents).toHaveLength(1)
      expect(result.data?.documents[0].montant_ttc).toBe(1200)
      expect(result.data?.movements).toHaveLength(1)
      expect(result.data?.movements[0].type).toBe('Sortie')
      expect(result.error).toBeUndefined()
    })

    it('should infer movement type from document type', async () => {
      mockProduitFindMany.mockResolvedValue([])
      mockPartenaireFindMany.mockResolvedValue([])
      mockDocVenteFindMany.mockResolvedValue([])
      mockLigneDocumentFindMany.mockResolvedValue([
        {
          id_ligne: 2,
          quantite_livree: 5,
          numero_ligne: 1,
          produit: { nom_produit: 'Product B', code_produit: 'P002' },
          document: { numero_document: 'BL-001', date_document: new Date(), type_document: 'LIVRAISON' },
        },
      ])

      const result = await getDashboardData()

      expect(result.data?.movements[0].type).toBe('Entrée')
    })

    it('should default movement type to Ajustement', async () => {
      mockProduitFindMany.mockResolvedValue([])
      mockPartenaireFindMany.mockResolvedValue([])
      mockDocVenteFindMany.mockResolvedValue([])
      mockLigneDocumentFindMany.mockResolvedValue([
        {
          id_ligne: 3,
          quantite_livree: 3,
          numero_ligne: 1,
          produit: { nom_produit: 'Product C', code_produit: 'P003' },
          document: { numero_document: 'ADJ-001', date_document: new Date(), type_document: 'AJUSTEMENT' },
        },
      ])

      const result = await getDashboardData()

      expect(result.data?.movements[0].type).toBe('Ajustement')
    })

    it('should return { data, error } on error', async () => {
      mockProduitFindMany.mockRejectedValue(new Error('DB error'))

      const result = await getDashboardData()

      expect(result.data?.products).toEqual([])
      expect(result.data?.partners).toEqual([])
      expect(result.data?.documents).toEqual([])
      expect(result.data?.movements).toEqual([])
      expect(result.error).toBe('Failed to fetch dashboard data')
    })
  })
})
