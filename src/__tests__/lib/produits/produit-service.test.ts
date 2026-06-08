import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fromAny } from '@total-typescript/shoehorn'

const {
  mockProduitFindMany,
  mockProduitCount,
  mockProduitCreate,
  mockProduitUpdate,
  mockProduitDelete,
  mockProduitFindUnique,
  mockQueryRaw,
} = vi.hoisted(() => ({
  mockProduitFindMany: vi.fn(),
  mockProduitCount: vi.fn(),
  mockProduitCreate: vi.fn(),
  mockProduitUpdate: vi.fn(),
  mockProduitDelete: vi.fn(),
  mockProduitFindUnique: vi.fn(),
  mockQueryRaw: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    produit: {
      findMany: mockProduitFindMany,
      count: mockProduitCount,
      create: mockProduitCreate,
      update: mockProduitUpdate,
      delete: mockProduitDelete,
      findUnique: mockProduitFindUnique,
    },
    $queryRaw: mockQueryRaw,
  },
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

vi.mock('@/lib/cache/adapter', () => ({
  getAdapter: () => ({
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    acquireLock: vi.fn(),
    releaseLock: vi.fn(),
  }),
}))

import { createArticle, updateArticle } from '@/lib/produits/produit-service'

function mockDbProduit(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
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
    prix_achat: null,
    prix_dernier_achat: null,
    coefficient: null,
    prix_vente: null,
    prix_gros: null,
    taux_tva: null,
    type_suivi_stock: null,
    quantite_min_commande: null,
    niveau_reappro_quantite: null,
    stock_minimum: null,
    stock_maximum: null,
    activer_suivi_stock: true,
    id_fournisseur_principal: null,
    reference_fournisseur: null,
    delai_livraison_fournisseur_jours: null,
    est_actif: true,
    en_sommeil: false,
    est_abandonne: false,
    date_creation: new Date('2025-01-01'),
    date_modification: new Date('2025-01-01'),
    cree_par: null,
    modifie_par: null,
    compte_general_vente: null,
    compte_general_achat: null,
    code_taxe_vente: null,
    code_taxe_achat: null,
    ...overrides,
  }
}

describe('Produit Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createArticle', () => {
    it('should create an article and return ArticleWithStock with stock_global', async () => {
      mockProduitFindUnique.mockResolvedValue(null)
      const mockCreated = mockDbProduit({ code_produit: 'PROD-002', nom_produit: 'New Product', cree_par: 'user-1' })
      mockProduitCreate.mockResolvedValue(mockCreated)
      mockQueryRaw.mockResolvedValue([{ id_produit: 1, stock_global: 50 }])

      const input = { code_produit: 'PROD-002', nom_produit: 'New Product' }
      const result = await createArticle(input, 'user-1')

      expect(result.error).toBeUndefined()
      expect(result.data).toBeDefined()
      expect(result.data!.code_produit).toBe('PROD-002')
      expect(result.data!.stock_global).toBe(50)
      expect(result.data!.cree_par).toBe('user-1')
      expect(mockProduitCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          code_produit: 'PROD-002',
          nom_produit: 'New Product',
          cree_par: 'user-1',
        }),
      })
    })

    it('should return { error } for invalid input', async () => {
      const result = await createArticle(fromAny({ code_produit: '', nom_produit: 'Test' }), 'user-1')

      expect(result.error).toBeDefined()
      expect(result.data).toBeUndefined()
    })

    it('should return { error } on DB failure', async () => {
      mockProduitFindUnique.mockResolvedValue(null)
      mockProduitCreate.mockRejectedValue(new Error('DB error'))

      const input = { code_produit: 'PROD-003', nom_produit: 'Fail Product' }
      const result = await createArticle(input, 'user-1')

      expect(result.error).toBe('DB error')
      expect(result.data).toBeUndefined()
    })

    it('should return { error } on duplicate code_produit', async () => {
      mockProduitFindUnique.mockResolvedValue(mockDbProduit({ code_produit: 'PROD-001' }))

      const input = { code_produit: 'PROD-001', nom_produit: 'Duplicate' }
      const result = await createArticle(input, 'user-1')

      expect(result.error).toBeDefined()
      expect(result.error).toContain("L'article PROD-001 existe déjà")
      expect(result.data).toBeUndefined()
    })
  })

  describe('updateArticle', () => {
    it('should update an article and return ArticleWithStock with stock_global', async () => {
      mockProduitFindUnique.mockResolvedValue(mockDbProduit())
      const mockUpdated = mockDbProduit({ nom_produit: 'Updated Product', modifie_par: 'user-1' })
      mockProduitUpdate.mockResolvedValue(mockUpdated)
      mockQueryRaw.mockResolvedValue([{ id_produit: 1, stock_global: 75 }])

      const result = await updateArticle(1, { nom_produit: 'Updated Product' }, 'user-1')

      expect(result.error).toBeUndefined()
      expect(result.data).toBeDefined()
      expect(result.data!.nom_produit).toBe('Updated Product')
      expect(result.data!.stock_global).toBe(75)
      expect(mockProduitUpdate).toHaveBeenCalledWith({
        where: { id_produit: 1 },
        data: expect.objectContaining({
          nom_produit: 'Updated Product',
          modifie_par: 'user-1',
        }),
      })
    })

    it('should return { error } for non-existent article', async () => {
      mockProduitFindUnique.mockResolvedValue(null)

      const result = await updateArticle(999, { nom_produit: 'Ghost' }, 'user-1')

      expect(result.error).toBe('Article introuvable')
      expect(result.data).toBeUndefined()
    })

    it('should return { error } for invalid input', async () => {
      const result = await updateArticle(1, fromAny({ nom_produit: '' }), 'user-1')

      expect(result.error).toBeDefined()
      expect(result.data).toBeUndefined()
    })

    it('should return { error } on DB failure', async () => {
      mockProduitFindUnique.mockResolvedValue(mockDbProduit())
      mockProduitUpdate.mockRejectedValue(new Error('DB error'))

      const result = await updateArticle(1, { nom_produit: 'Fail' }, 'user-1')

      expect(result.error).toBe('DB error')
      expect(result.data).toBeUndefined()
    })

    it('should return { error } on duplicate code_produit change', async () => {
      mockProduitFindUnique
        .mockResolvedValueOnce(mockDbProduit({ code_produit: 'PROD-001' }))
        .mockResolvedValueOnce(mockDbProduit({ code_produit: 'PROD-002', id_produit: 2 }))

      const result = await updateArticle(1, { code_produit: 'PROD-002' }, 'user-1')

      expect(result.error).toBeDefined()
      expect(result.error).toContain("L'article PROD-002 existe déjà")
      expect(result.data).toBeUndefined()
    })
  })
})
