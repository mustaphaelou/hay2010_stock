import { describe, it, expect, vi, beforeEach } from 'vitest'

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

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

import { getAffaires, getAffaireByCode, getDocumentsByAffaire } from '@/lib/affaires/affaire-service'

function mockDbAffaire(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id_affaire: 1,
    code_affaire: 'AFF-001',
    intitule_affaire: 'Project Alpha',
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
    date_creation: new Date('2025-01-01'),
    date_modification: new Date('2025-01-01'),
    cree_par: null,
    modifie_par: null,
    client: null,
    ...overrides,
  }
}

describe('Affaire Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAffaires', () => {
    it('should return paginated affaires with computed fields', async () => {
      const mockAffaire = mockDbAffaire({
        client: { nom_partenaire: 'Client A', code_partenaire: 'CLI-001', type_partenaire: 'CLIENT' },
        budget_prevu: 50000,
        chiffre_affaires: 30000,
        marge: 10000,
      })
      mockAffaireFindMany.mockResolvedValue([mockAffaire])
      mockAffaireCount.mockResolvedValue(1)

      const result = await getAffaires(1, 50)

      expect(result.data).toHaveLength(1)
      expect(result.data[0].code_affaire).toBe('AFF-001')
      expect(result.data[0].budget_prevu_num).toBe(50000)
      expect(result.data[0].chiffre_affaires_num).toBe(30000)
      expect(result.data[0].marge_num).toBe(10000)
      expect(result.data[0].client).toEqual({ nom_partenaire: 'Client A', code_partenaire: 'CLI-001', type_partenaire: 'CLIENT' })
      expect(result.meta.total).toBe(1)
      expect(result.error).toBeUndefined()
    })

    it('should return { data: [], error } on DB error', async () => {
      mockAffaireFindMany.mockRejectedValue(new Error('DB error'))

      const result = await getAffaires()

      expect(result.data).toEqual([])
      expect(result.error).toBe('Failed to fetch affaires')
    })

    it('should handle null client gracefully', async () => {
      mockAffaireFindMany.mockResolvedValue([mockDbAffaire()])
      mockAffaireCount.mockResolvedValue(1)

      const result = await getAffaires()

      expect(result.data[0].client).toBeNull()
      expect(result.data[0].budget_prevu_num).toBe(0)
    })

    it('should apply type_affaire filter when provided', async () => {
      mockAffaireFindMany.mockResolvedValue([])
      mockAffaireCount.mockResolvedValue(0)

      await getAffaires(1, 50, { type_affaire: 'Proposition' })

      expect(mockAffaireFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type_affaire: 'Proposition' }),
        })
      )
    })
  })

  describe('getAffaireByCode', () => {
    it('should return { data, error?: undefined } for valid code', async () => {
      const mockAffaire = mockDbAffaire({
        client: { nom_partenaire: 'Client A', code_partenaire: 'CLI-001', type_partenaire: 'CLIENT' },
      })
      mockAffaireFindFirst.mockResolvedValue(mockAffaire)

      const result = await getAffaireByCode('AFF-001')

      expect(result.error).toBeUndefined()
      expect(result.data).toBeDefined()
      expect(result.data!.code_affaire).toBe('AFF-001')
      expect(result.data!.client).toBeDefined()
      expect(mockAffaireFindFirst).toHaveBeenCalledWith({
        where: { code_affaire: 'AFF-001' },
        include: {
          client: { select: { nom_partenaire: true, code_partenaire: true, type_partenaire: true } },
        },
      })
    })

    it('should return { error } for invalid code', async () => {
      const result = await getAffaireByCode('')

      expect(result.error).toBeDefined()
      expect(result.data).toBeUndefined()
    })

    it('should return { data: null, error } when affaire not found', async () => {
      mockAffaireFindFirst.mockResolvedValue(null)

      const result = await getAffaireByCode('AFF-999')

      expect(result.error).toBe('Affaire not found')
      expect(result.data).toBeNull()
    })

    it('should return { error } on DB failure', async () => {
      mockAffaireFindFirst.mockRejectedValue(new Error('DB error'))

      const result = await getAffaireByCode('AFF-001')

      expect(result.error).toBe('Failed to fetch affaire')
      expect(result.data).toBeUndefined()
    })
  })

  describe('getDocumentsByAffaire', () => {
    it('should return { data, error?: undefined } for valid affaire code', async () => {
      const mockDocs = [{
        id_document: 1,
        numero_document: 'DOC-001',
        type_document: 'Facture',
        montant_ht: 100,
        montant_ttc: 120,
        solde_du: 50,
        partenaire: { nom_partenaire: 'Client A', type_partenaire: 'CLIENT' },
        date_document: new Date(),
      }]
      mockDocVenteFindMany.mockResolvedValue(mockDocs)

      const result = await getDocumentsByAffaire('AFF-001')

      expect(result.data).toHaveLength(1)
      expect(result.data[0].type_document).toBe('Facture')
      expect(result.error).toBeUndefined()
    })

    it('should return { data: [], error } for invalid affaire code', async () => {
      const result = await getDocumentsByAffaire('')

      expect(result.data).toEqual([])
      expect(result.error).toBe('Invalid affaire code')
    })

    it('should return { data: [], error } on DB error', async () => {
      mockDocVenteFindMany.mockRejectedValue(new Error('DB error'))

      const result = await getDocumentsByAffaire('AFF-001')

      expect(result.data).toEqual([])
      expect(result.error).toBe('Failed to fetch documents for affaire')
    })
  })
})
