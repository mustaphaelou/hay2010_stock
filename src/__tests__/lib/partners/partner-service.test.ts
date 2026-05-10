import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockPartenaireFindMany, mockPartenaireCount, mockPartenaireCreate, mockPartenaireUpdate, mockPartenaireDelete, mockPartenaireFindUnique, mockDocVenteFindMany, mockDocVenteCount } = vi.hoisted(() => ({
  mockPartenaireFindMany: vi.fn(),
  mockPartenaireCount: vi.fn(),
  mockPartenaireCreate: vi.fn(),
  mockPartenaireUpdate: vi.fn(),
  mockPartenaireDelete: vi.fn(),
  mockPartenaireFindUnique: vi.fn(),
  mockDocVenteFindMany: vi.fn(),
  mockDocVenteCount: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    partenaire: {
      findMany: mockPartenaireFindMany,
      count: mockPartenaireCount,
      create: mockPartenaireCreate,
      update: mockPartenaireUpdate,
      delete: mockPartenaireDelete,
      findUnique: mockPartenaireFindUnique,
    },
    docVente: {
      findMany: mockDocVenteFindMany,
      count: mockDocVenteCount,
    },
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

import { getPartners, getPartnerById, getPartnerDocuments, createPartner, updatePartner, deletePartner } from '@/lib/partners/partner-service'

function mockDbPartner(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id_partenaire: 1,
    code_partenaire: 'CLI-001',
    nom_partenaire: 'Test Partner',
    type_partenaire: 'CLIENT',
    adresse_email: null,
    numero_telephone: null,
    numero_fax: null,
    url_site_web: null,
    adresse_rue: null,
    code_postal: null,
    ville: null,
    pays: 'Maroc',
    numero_tva: null,
    numero_ice: null,
    numero_rc: null,
    delai_paiement_jours: 30,
    limite_credit: null,
    pourcentage_remise: 0,
    numero_compte_bancaire: null,
    code_banque: null,
    numero_iban: null,
    code_swift: null,
    est_actif: true,
    est_bloque: false,
    date_creation: new Date('2025-01-01'),
    date_modification: new Date('2025-01-01'),
    cree_par: null,
    modifie_par: null,
    compte_collectif: null,
    compte_auxiliaire: null,
    ...overrides,
  }
}

describe('Partner Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getPartners', () => {
    it('should return paginated partners', async () => {
      const mockPartner = mockDbPartner()
      mockPartenaireFindMany.mockResolvedValue([mockPartner])
      mockPartenaireCount.mockResolvedValue(1)

      const result = await getPartners(undefined, 1, 50)

      expect(result.data).toHaveLength(1)
      expect(result.data[0].code_partenaire).toBe('CLI-001')
      expect(result.meta.total).toBe(1)
      expect(result.error).toBeUndefined()
    })

    it('should return { data: [], error } on DB error', async () => {
      mockPartenaireFindMany.mockRejectedValue(new Error('DB error'))

      const result = await getPartners()

      expect(result.data).toEqual([])
      expect(result.error).toBe('Échec de la récupération des partenaires')
    })

    it('should search by nom_partenaire, code_partenaire, and ville', async () => {
      const mockPartner = mockDbPartner()
      mockPartenaireFindMany.mockResolvedValue([mockPartner])
      mockPartenaireCount.mockResolvedValue(1)

      const result = await getPartners(undefined, 1, 50, 'Alpha')

      expect(result.data).toHaveLength(1)
      expect(mockPartenaireFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { nom_partenaire: { contains: 'Alpha', mode: 'insensitive' } },
              { code_partenaire: { contains: 'Alpha', mode: 'insensitive' } },
              { ville: { contains: 'Alpha', mode: 'insensitive' } },
            ]),
          }),
        })
      )
    })

    it('should sort by specified field', async () => {
      mockPartenaireFindMany.mockResolvedValue([])
      mockPartenaireCount.mockResolvedValue(0)

      await getPartners(undefined, 1, 50, undefined, 'ville', 'desc')

      expect(mockPartenaireFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { ville: 'desc' } })
      )
    })

    it('should default to nom_partenaire asc for invalid sort field', async () => {
      mockPartenaireFindMany.mockResolvedValue([])
      mockPartenaireCount.mockResolvedValue(0)

      await getPartners(undefined, 1, 50, undefined, 'invalid_field')

      expect(mockPartenaireFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { nom_partenaire: 'asc' } })
      )
    })
  })

  describe('getPartnerById', () => {
    it('should return partner by id', async () => {
      const mockPartner = mockDbPartner()
      mockPartenaireFindUnique.mockResolvedValue(mockPartner)

      const result = await getPartnerById(1)

      expect(result.error).toBeUndefined()
      expect(result.data).toBeDefined()
      expect(result.data!.id_partenaire).toBe(1)
      expect(result.data!.code_partenaire).toBe('CLI-001')
      expect(result.data!.solde_courant).toBe(0)
    })

    it('should return { error } for non-existent partner', async () => {
      mockPartenaireFindUnique.mockResolvedValue(null)

      const result = await getPartnerById(999)

      expect(result.error).toBeDefined()
      expect(result.error).toBe('Partenaire introuvable')
      expect(result.data).toBeUndefined()
    })

    it('should return { error } for invalid id', async () => {
      const result = await getPartnerById(-1)

      expect(result.error).toBeDefined()
      expect(result.data).toBeUndefined()
    })

    it('should return { error } on DB failure', async () => {
      mockPartenaireFindUnique.mockRejectedValue(new Error('DB error'))

      const result = await getPartnerById(1)

      expect(result.error).toBe('Échec de la récupération du partenaire')
      expect(result.data).toBeUndefined()
    })
  })

  describe('createPartner', () => {
    it('should create a partner and return { data, error?: undefined }', async () => {
      mockPartenaireFindUnique.mockResolvedValue(null)
      const mockCreated = mockDbPartner({ code_partenaire: 'CLI-002', nom_partenaire: 'New Partner' })
      mockPartenaireCreate.mockResolvedValue(mockCreated)

      const input = { code_partenaire: 'CLI-002', nom_partenaire: 'New Partner', type_partenaire: 'CLIENT' as const }
      const result = await createPartner(input, 'user-1')

      expect(result.error).toBeUndefined()
      expect(result.data).toBeDefined()
      expect(result.data!.code_partenaire).toBe('CLI-002')
      expect(result.data!.nom_partenaire).toBe('New Partner')
      expect(result.data!.solde_courant).toBe(0)
      expect(mockPartenaireCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          code_partenaire: 'CLI-002',
          nom_partenaire: 'New Partner',
          type_partenaire: 'CLIENT',
          cree_par: 'user-1',
        }),
      })
    })

    it('should return { error } for invalid input', async () => {
      const result = await createPartner({ code_partenaire: '', nom_partenaire: 'Test' } as never, 'user-1')

      expect(result.error).toBeDefined()
      expect(result.data).toBeUndefined()
    })

    it('should return { error } on DB failure', async () => {
      mockPartenaireFindUnique.mockResolvedValue(null)
      mockPartenaireCreate.mockRejectedValue(new Error('DB error'))

      const input = { code_partenaire: 'CLI-003', nom_partenaire: 'Fail Partner', type_partenaire: 'CLIENT' as const }
      const result = await createPartner(input, 'user-1')

      expect(result.error).toBe('Échec de la création du partenaire')
      expect(result.data).toBeUndefined()
    })

    it('should return { error } on duplicate code', async () => {
      mockPartenaireFindUnique.mockResolvedValue(mockDbPartner({ code_partenaire: 'CLI-001' }))

      const input = { code_partenaire: 'CLI-001', nom_partenaire: 'Duplicate', type_partenaire: 'CLIENT' as const }
      const result = await createPartner(input, 'user-1')

      expect(result.error).toBeDefined()
      expect(result.error).toContain('existe déjà')
      expect(result.data).toBeUndefined()
    })
  })

  describe('updatePartner', () => {
    it('should update a partner and return { data, error?: undefined }', async () => {
      mockPartenaireFindUnique.mockResolvedValue(mockDbPartner())
      const mockUpdated = mockDbPartner({ nom_partenaire: 'Updated Partner' })
      mockPartenaireUpdate.mockResolvedValue(mockUpdated)

      const result = await updatePartner(1, { nom_partenaire: 'Updated Partner' }, 'user-1')

      expect(result.error).toBeUndefined()
      expect(result.data).toBeDefined()
      expect(result.data!.nom_partenaire).toBe('Updated Partner')
      expect(mockPartenaireUpdate).toHaveBeenCalledWith({
        where: { id_partenaire: 1 },
        data: expect.objectContaining({
          nom_partenaire: 'Updated Partner',
          modifie_par: 'user-1',
        }),
      })
    })

    it('should return { error } for invalid input', async () => {
      const result = await updatePartner(1, { type_partenaire: 'INVALID' as never }, 'user-1')

      expect(result.error).toBeDefined()
      expect(result.data).toBeUndefined()
    })

    it('should return { error } on DB failure', async () => {
      mockPartenaireFindUnique.mockResolvedValue(mockDbPartner())
      mockPartenaireUpdate.mockRejectedValue(new Error('DB error'))

      const result = await updatePartner(1, { nom_partenaire: 'Fail' }, 'user-1')

      expect(result.error).toBe('Échec de la mise à jour du partenaire')
      expect(result.data).toBeUndefined()
    })

    it('should return { error } for non-existent partner', async () => {
      mockPartenaireFindUnique.mockResolvedValue(null)

      const result = await updatePartner(999, { nom_partenaire: 'Ghost' }, 'user-1')

      expect(result.error).toBe('Partenaire introuvable')
      expect(result.data).toBeUndefined()
    })

    it('should return { error } on duplicate code change', async () => {
      mockPartenaireFindUnique
        .mockResolvedValueOnce(mockDbPartner({ code_partenaire: 'CLI-001' }))
        .mockResolvedValueOnce(mockDbPartner({ code_partenaire: 'CLI-002', id_partenaire: 2 }))

      const result = await updatePartner(1, { code_partenaire: 'CLI-002' }, 'user-1')

      expect(result.error).toBeDefined()
      expect(result.error).toContain('existe déjà')
      expect(result.data).toBeUndefined()
    })
  })

  describe('deletePartner', () => {
    it('should soft-delete a partner and return { success, error?: undefined }', async () => {
      mockPartenaireFindUnique.mockResolvedValue(mockDbPartner())
      mockPartenaireUpdate.mockResolvedValue(mockDbPartner({ est_actif: false }))

      const result = await deletePartner(1, 'user-1')

      expect(result.error).toBeUndefined()
      expect(result.data?.success).toBe(true)
      expect(mockPartenaireUpdate).toHaveBeenCalledWith({
        where: { id_partenaire: 1 },
        data: expect.objectContaining({ est_actif: false, modifie_par: 'user-1' }),
      })
    })

    it('should return { error } for non-existent partner', async () => {
      mockPartenaireFindUnique.mockResolvedValue(null)

      const result = await deletePartner(999, 'user-1')

      expect(result.error).toBe('Partenaire introuvable')
    })

    it('should return { error } for invalid input', async () => {
      const result = await deletePartner(-1, 'user-1')

      expect(result.error).toBeDefined()
      expect(result.data?.success).toBeUndefined()
    })

    it('should return { error } on DB failure', async () => {
      mockPartenaireFindUnique.mockResolvedValue(mockDbPartner())
      mockPartenaireUpdate.mockRejectedValue(new Error('DB error'))

      const result = await deletePartner(1, 'user-1')

      expect(result.error).toBe('Échec de la suppression du partenaire')
      expect(result.data?.success).toBeUndefined()
    })
  })

  describe('getPartnerDocuments', () => {
    it('should return partner documents', async () => {
      mockPartenaireFindUnique.mockResolvedValue(mockDbPartner())
      mockDocVenteFindMany.mockResolvedValue([{ id_document: 1, numero_document: 'FAC-001' }])
      mockDocVenteCount.mockResolvedValue(1)

      const result = await getPartnerDocuments(1, 1, 50)

      expect(result.error).toBeUndefined()
      expect(result.data).toHaveLength(1)
      expect(result.data[0].id_document).toBe(1)
      expect(result.meta.total).toBe(1)
    })

    it('should return { error } for non-existent partner', async () => {
      mockPartenaireFindUnique.mockResolvedValue(null)

      const result = await getPartnerDocuments(999)

      expect(result.error).toBe('Partenaire introuvable')
      expect(result.data).toEqual([])
    })

    it('should return { data: [], error } on DB failure', async () => {
      mockPartenaireFindUnique.mockResolvedValue(mockDbPartner())
      mockDocVenteFindMany.mockRejectedValue(new Error('DB error'))

      const result = await getPartnerDocuments(1)

      expect(result.error).toBe('Échec de la récupération des documents')
      expect(result.data).toEqual([])
    })
  })
})
