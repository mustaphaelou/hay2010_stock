import { describe, it, expect, beforeEach, vi } from 'vitest'

const { mockRequirePermission } = vi.hoisted(() => ({
  mockRequirePermission: vi.fn().mockResolvedValue({ id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' }),
}))

const { mockPartenaireFindMany, mockPartenaireCount } = vi.hoisted(() => ({
  mockPartenaireFindMany: vi.fn(),
  mockPartenaireCount: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    partenaire: {
      findMany: mockPartenaireFindMany,
      count: mockPartenaireCount,
    },
  },
}))

vi.mock('@/lib/auth/authorization', () => ({
  requirePermission: mockRequirePermission,
}))

vi.mock('@/lib/generated/prisma', () => ({
  TypePartenaire: { CLIENT: 'CLIENT', FOURNISSEUR: 'FOURNISSEUR', LES_DEUX: 'LES_DEUX' },
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

import { getPartners } from '@/app/actions/partners'

describe('Partners Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequirePermission.mockResolvedValue({ id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' })
  })

  describe('getPartners', () => {
    it('should require partners:read permission', async () => {
      mockRequirePermission.mockRejectedValue(new Error('Forbidden'))

      await expect(getPartners()).rejects.toThrow('Forbidden')
    })

    it('should return error for invalid type filter', async () => {
      const result = await getPartners('INVALID_TYPE')

      expect(result.error).toBe('Invalid filter parameters')
      expect(result.data).toEqual([])
    })

    it('should return all partners when type is undefined', async () => {
      const mockPartners = [
        {
          id_partenaire: 1,
          code_partenaire: 'P-001',
          nom_partenaire: 'Client A',
          type_partenaire: 'CLIENT',
          adresse_email: 'a@test.com',
          numero_telephone: null,
          numero_fax: null,
          url_site_web: null,
          adresse_rue: null,
          code_postal: null,
          ville: null,
          pays: null,
          numero_tva: null,
          numero_ice: null,
          numero_rc: null,
          delai_paiement_jours: 30,
          limite_credit: 10000,
          pourcentage_remise: 5,
          numero_compte_bancaire: null,
          code_banque: null,
          numero_iban: null,
          code_swift: null,
          est_actif: true,
          est_bloque: false,
          date_creation: new Date(),
          date_modification: new Date(),
          cree_par: null,
          modifie_par: null,
          compte_collectif: null,
          compte_auxiliaire: null,
        },
      ]
      mockPartenaireFindMany.mockResolvedValue(mockPartners)
      mockPartenaireCount.mockResolvedValue(1)

      const result = await getPartners()

      expect(result.data).toHaveLength(1)
      expect(result.data[0].plafond_credit).toBe(10000)
      expect(result.data[0].solde_courant).toBe(0)
      expect(result.meta.total).toBe(1)
    })

    it('should filter partners by type', async () => {
      mockPartenaireFindMany.mockResolvedValue([])
      mockPartenaireCount.mockResolvedValue(0)

      await getPartners('CLIENT')

      expect(mockPartenaireFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type_partenaire: 'CLIENT' },
        })
      )
      expect(mockPartenaireCount).toHaveBeenCalledWith({
        where: { type_partenaire: 'CLIENT' },
      })
    })

    it('should not filter when type is "all"', async () => {
      mockPartenaireFindMany.mockResolvedValue([])
      mockPartenaireCount.mockResolvedValue(0)

      await getPartners('all')

      expect(mockPartenaireFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} })
      )
    })

    it('should return error on DB failure', async () => {
      mockPartenaireFindMany.mockRejectedValue(new Error('DB error'))

      const result = await getPartners()

      expect(result.data).toEqual([])
      expect(result.error).toBe('Failed to fetch partners')
    })

    it('should compute pagination correctly', async () => {
      mockPartenaireFindMany.mockResolvedValue([])
      mockPartenaireCount.mockResolvedValue(100)

      const result = await getPartners(undefined, 3, 50)

      expect(result.meta.totalPages).toBe(2)
      expect(result.meta.page).toBe(3)
    })
  })
})
