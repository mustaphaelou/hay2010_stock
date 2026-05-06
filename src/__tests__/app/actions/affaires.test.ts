import { describe, it, expect, beforeEach, vi } from 'vitest'

const { mockRequirePermission } = vi.hoisted(() => ({
  mockRequirePermission: vi.fn().mockResolvedValue({ id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' }),
}))

const { mockAffaireFindMany, mockAffaireCount, mockAffaireFindFirst, mockDocVenteFindMany } = vi.hoisted(() => ({
  mockAffaireFindMany: vi.fn(),
  mockAffaireCount: vi.fn(),
  mockAffaireFindFirst: vi.fn(),
  mockDocVenteFindMany: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    affaire: {
      findMany: mockAffaireFindMany,
      count: mockAffaireCount,
      findFirst: mockAffaireFindFirst,
    },
    docVente: { findMany: mockDocVenteFindMany },
  },
}))

vi.mock('@/lib/auth/authorization', () => ({
  requirePermission: mockRequirePermission,
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

import { getAffaires, getAffaireByCode, getDocumentsByAffaire } from '@/app/actions/affaires'

describe('Affaires Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequirePermission.mockResolvedValue({ id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' })
  })

  describe('getAffaires', () => {
    it('should require affairs:read permission', async () => {
      mockRequirePermission.mockRejectedValue(new Error('Forbidden'))

      await expect(getAffaires()).rejects.toThrow('Forbidden')
      expect(mockRequirePermission).toHaveBeenCalledWith('affairs:read')
    })

    it('should return paginated affaires with computed fields', async () => {
      mockAffaireFindMany.mockResolvedValue([
        {
          id_affaire: 1,
          code_affaire: 'AFF-001',
          intitule_affaire: 'Project A',
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
          date_creation: new Date(),
          date_modification: new Date(),
          cree_par: null,
          modifie_par: null,
          client: null,
        },
      ])
      mockAffaireCount.mockResolvedValue(1)

      const result = await getAffaires(1, 50)

      expect(result.data).toHaveLength(1)
      expect(result.data[0].code_affaire).toBe('AFF-001')
      expect(result.data[0].client).toBeNull()
      expect(result.meta.total).toBe(1)
      expect(result.error).toBeUndefined()
    })

    it('should return { data: [], error } on error', async () => {
      mockAffaireFindMany.mockRejectedValue(new Error('DB error'))

      const result = await getAffaires()

      expect(result.data).toEqual([])
      expect(result.error).toBe('Failed to fetch affaires')
    })
  })

  describe('getAffaireByCode', () => {
    it('should require affairs:read permission', async () => {
      mockRequirePermission.mockRejectedValue(new Error('Forbidden'))

      await expect(getAffaireByCode('AFF-001')).rejects.toThrow('Forbidden')
    })

    it('should return { data, error?: undefined } for valid code', async () => {
      mockAffaireFindFirst.mockResolvedValue({
        id_affaire: 1,
        code_affaire: 'AFF-001',
        intitule_affaire: 'Project A',
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
        date_creation: new Date(),
        date_modification: new Date(),
        cree_par: null,
        modifie_par: null,
        client: null,
      })

      const result = await getAffaireByCode('AFF-001')

      expect(result.error).toBeUndefined()
      expect(result.data).toBeDefined()
    })
  })

  describe('getDocumentsByAffaire', () => {
    it('should require affairs:read permission', async () => {
      mockRequirePermission.mockRejectedValue(new Error('Forbidden'))

      await expect(getDocumentsByAffaire('AFF-001')).rejects.toThrow('Forbidden')
    })

    it('should return { data: [], error } for invalid affaire code', async () => {
      const result = await getDocumentsByAffaire('')

      expect(result.data).toEqual([])
      expect(result.error).toBe('Invalid affaire code')
    })

    it('should return { data, error?: undefined } for a valid affaire code', async () => {
      mockDocVenteFindMany.mockResolvedValue([
        {
          id_document: 1,
          numero_document: 'DOC-001',
          type_document: 'Facture',
          montant_ht: 100,
          montant_ttc: 120,
          solde_du: 50,
          partenaire: { nom_partenaire: 'Client A', type_partenaire: 'CLIENT' },
          date_document: new Date(),
        },
      ])

      const result = await getDocumentsByAffaire('AFF-001')

      expect(result.data).toHaveLength(1)
      expect(result.data[0].type_document).toBe('Facture')
      expect(result.error).toBeUndefined()
    })

    it('should return { data: [], error } on DB error', async () => {
      mockDocVenteFindMany.mockRejectedValue(new Error('DB error'))

      const result = await getDocumentsByAffaire('AFF-001')

      expect(result.data).toEqual([])
      expect(result.error).toBe('Failed to fetch documents for affaire')
    })
  })
})
