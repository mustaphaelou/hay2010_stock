import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockAffaireFindMany, mockAffaireCount, mockAffaireFindFirst, mockAffaireFindUnique, mockAffaireCreate, mockAffaireUpdate, mockDocVenteFindMany } = vi.hoisted(() => ({
  mockAffaireFindMany: vi.fn(),
  mockAffaireCount: vi.fn(),
  mockAffaireFindFirst: vi.fn(),
  mockAffaireFindUnique: vi.fn(),
  mockAffaireCreate: vi.fn(),
  mockAffaireUpdate: vi.fn(),
  mockDocVenteFindMany: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    affaire: {
      findMany: mockAffaireFindMany,
      count: mockAffaireCount,
      findFirst: mockAffaireFindFirst,
      findUnique: mockAffaireFindUnique,
      create: mockAffaireCreate,
      update: mockAffaireUpdate,
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

import { getAffaires, getAffaireByCode, getDocumentsByAffaire, createAffaire, updateAffaire, getAffaireById } from '@/lib/affaires/affaire-service'

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

const validCreateInput = {
  code_affaire: 'AFF-002',
  intitule_affaire: 'New Affaire',
  type_affaire: 'Proposition',
  statut_affaire: 'En cours',
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
      expect(result.error).toBe('Échec de la récupération des affaires')
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

  describe('getAffaireById', () => {
    it('should return affaire with computed fields when found', async () => {
      const mockAffaire = mockDbAffaire({
        client: { nom_partenaire: 'Client A', code_partenaire: 'CLI-001', type_partenaire: 'CLIENT' },
        budget_prevu: 50000,
      })
      mockAffaireFindUnique.mockResolvedValue(mockAffaire)

      const result = await getAffaireById(1)

      expect(result.error).toBeUndefined()
      expect(result.data).toBeDefined()
      expect(result.data!.code_affaire).toBe('AFF-001')
      expect(result.data!.budget_prevu_num).toBe(50000)
    })

    it('should return NOT_FOUND when affaire does not exist', async () => {
      mockAffaireFindUnique.mockResolvedValue(null)

      const result = await getAffaireById(999)

      expect(result.error).toBe('Affaire introuvable')
      expect(result.data).toBeUndefined()
    })

    it('should return error on DB failure', async () => {
      mockAffaireFindUnique.mockRejectedValue(new Error('DB error'))

      const result = await getAffaireById(1)

      expect(result.error).toBeDefined()
      expect(result.data).toBeUndefined()
    })
  })

  describe('createAffaire', () => {
    it('should create an affaire with computed fields', async () => {
      mockAffaireFindUnique.mockResolvedValue(null)
      mockAffaireCreate.mockResolvedValue(
        mockDbAffaire({ code_affaire: 'AFF-002', cree_par: 'user-1' })
      )

      const result = await createAffaire(validCreateInput, 'user-1')

      expect(result.error).toBeUndefined()
      expect(result.data).toBeDefined()
      expect(result.data!.code_affaire).toBe('AFF-002')
      expect(result.data!.cree_par).toBe('user-1')
    })

    it('should return CONFLICT when code_affaire already exists', async () => {
      mockAffaireFindUnique.mockResolvedValue(mockDbAffaire())

      const result = await createAffaire(validCreateInput, 'user-1')

      expect(result.error).toContain('existe déjà')
      expect(result.code).toBe('CONFLICT')
      expect(result.data).toBeUndefined()
    })
  })

  describe('updateAffaire', () => {
    it('should update an affaire and return computed fields', async () => {
      const existing = mockDbAffaire()
      mockAffaireFindUnique.mockResolvedValue(existing)
      mockAffaireUpdate.mockResolvedValue(
        mockDbAffaire({ intitule_affaire: 'Updated' })
      )

      const result = await updateAffaire(1, { intitule_affaire: 'Updated' }, 'user-1')

      expect(result.error).toBeUndefined()
      expect(result.data).toBeDefined()
      expect(result.data!.intitule_affaire).toBe('Updated')
    })

    it('should return CONFLICT when changing to an existing code_affaire', async () => {
      const existing = mockDbAffaire()
      mockAffaireFindUnique
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(mockDbAffaire({ code_affaire: 'AFF-999' }))

      const result = await updateAffaire(1, { code_affaire: 'AFF-999' }, 'user-1')

      expect(result.error).toContain('existe déjà')
      expect(result.code).toBe('CONFLICT')
    })

    it('should return NOT_FOUND when affaire does not exist', async () => {
      mockAffaireFindUnique.mockResolvedValue(null)

      const result = await updateAffaire(999, { intitule_affaire: 'Updated' }, 'user-1')

      expect(result.error).toBe('Affaire introuvable')
      expect(result.data).toBeUndefined()
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

    it('should return { error } when affaire not found', async () => {
      mockAffaireFindFirst.mockResolvedValue(null)

      const result = await getAffaireByCode('AFF-999')

      expect(result.error).toBe('Affaire introuvable')
      expect(result.data).toBeUndefined()
    })

    it('should return { error } on DB failure', async () => {
      mockAffaireFindFirst.mockRejectedValue(new Error('DB error'))

      const result = await getAffaireByCode('AFF-001')

      expect(result.error).toBe('Échec de la récupération de l\'affaire')
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
      expect(result.error).toBe('Code affaire invalide')
    })

    it('should return { data: [], error } on DB error', async () => {
      mockDocVenteFindMany.mockRejectedValue(new Error('DB error'))

      const result = await getDocumentsByAffaire('AFF-001')

      expect(result.data).toEqual([])
      expect(result.error).toBe('Échec de la récupération des documents de l\'affaire')
    })
  })
})
