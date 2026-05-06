import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockPartenaireFindMany, mockPartenaireCount, mockPartenaireCreate, mockPartenaireUpdate, mockPartenaireDelete, mockPartenaireFindUnique } = vi.hoisted(() => ({
  mockPartenaireFindMany: vi.fn(),
  mockPartenaireCount: vi.fn(),
  mockPartenaireCreate: vi.fn(),
  mockPartenaireUpdate: vi.fn(),
  mockPartenaireDelete: vi.fn(),
  mockPartenaireFindUnique: vi.fn(),
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

import { getPartners, createPartner, updatePartner, deletePartner } from '@/lib/partners/partner-service'
import type { PartnerWithComputed } from '@/lib/types'

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
      expect(result.error).toBe('Failed to fetch partners')
    })
  })

  describe('createPartner', () => {
    it('should create a partner and return { data, error?: undefined }', async () => {
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
      mockPartenaireCreate.mockRejectedValue(new Error('DB error'))

      const input = { code_partenaire: 'CLI-003', nom_partenaire: 'Fail Partner', type_partenaire: 'CLIENT' as const }
      const result = await createPartner(input, 'user-1')

      expect(result.error).toBe('Failed to create partner')
      expect(result.data).toBeUndefined()
    })
  })

  describe('updatePartner', () => {
    it('should update a partner and return { data, error?: undefined }', async () => {
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
      mockPartenaireUpdate.mockRejectedValue(new Error('DB error'))

      const result = await updatePartner(1, { nom_partenaire: 'Fail' }, 'user-1')

      expect(result.error).toBe('Failed to update partner')
      expect(result.data).toBeUndefined()
    })
  })

  describe('deletePartner', () => {
    it('should delete a partner and return { success, error?: undefined }', async () => {
      mockPartenaireDelete.mockResolvedValue(mockDbPartner())

      const result = await deletePartner(1)

      expect(result.error).toBeUndefined()
      expect(result.success).toBe(true)
      expect(mockPartenaireDelete).toHaveBeenCalledWith({
        where: { id_partenaire: 1 },
      })
    })

    it('should return { error } for invalid input', async () => {
      const result = await deletePartner(-1)

      expect(result.error).toBeDefined()
      expect(result.success).toBeUndefined()
    })

    it('should return { error } on DB failure', async () => {
      mockPartenaireDelete.mockRejectedValue(new Error('DB error'))

      const result = await deletePartner(1)

      expect(result.error).toBe('Failed to delete partner')
      expect(result.success).toBeUndefined()
    })
  })
})
