import { describe, it, expect, beforeEach, vi } from 'vitest'

const { mockRequirePermission } = vi.hoisted(() => ({
  mockRequirePermission: vi.fn().mockResolvedValue({ id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' }),
}))

const { mockAffaireFindMany, mockDocVenteFindMany } = vi.hoisted(() => ({
  mockAffaireFindMany: vi.fn(),
  mockDocVenteFindMany: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    affaire: { findMany: mockAffaireFindMany },
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

import { getAffaires, getDocumentsByAffaire } from '@/app/actions/affaires'

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

    it('should return affaire codes from active affaires', async () => {
      mockAffaireFindMany.mockResolvedValue([
        { code_affaire: 'AFF-001', intitule_affaire: 'Project A' },
        { code_affaire: 'AFF-002', intitule_affaire: 'Project B' },
      ])

      const result = await getAffaires()

      expect(result).toEqual(['AFF-001', 'AFF-002'])
      expect(mockAffaireFindMany).toHaveBeenCalledWith({
        select: { code_affaire: true, intitule_affaire: true },
        where: { est_actif: true },
        orderBy: { code_affaire: 'asc' },
      })
    })

    it('should return empty array on error', async () => {
      mockAffaireFindMany.mockRejectedValue(new Error('DB error'))

      const result = await getAffaires()

      expect(result).toEqual([])
    })
  })

  describe('getDocumentsByAffaire', () => {
    it('should require affairs:read permission', async () => {
      mockRequirePermission.mockRejectedValue(new Error('Forbidden'))

      await expect(getDocumentsByAffaire('AFF-001')).rejects.toThrow('Forbidden')
    })

    it('should return empty array for invalid affaire code', async () => {
      const result = await getDocumentsByAffaire('')

      expect(result).toEqual([])
    })

    it('should return documents for a valid affaire code', async () => {
      const mockDocs = [
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
      ]
      mockDocVenteFindMany.mockResolvedValue(mockDocs)

      const result = await getDocumentsByAffaire('AFF-001')

      expect(result).toHaveLength(1)
      expect(result[0].type_document).toBe('Facture')
      expect(mockDocVenteFindMany).toHaveBeenCalledWith({
        where: { numero_affaire: 'AFF-001' },
        include: { partenaire: { select: { nom_partenaire: true, type_partenaire: true } } },
        orderBy: { date_document: 'desc' },
      })
    })

    it('should return empty array on DB error', async () => {
      mockDocVenteFindMany.mockRejectedValue(new Error('DB error'))

      const result = await getDocumentsByAffaire('AFF-001')

      expect(result).toEqual([])
    })
  })
})
