import { describe, it, expect, vi, beforeEach } from 'vitest'

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

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

import { getAffaires, getDocumentsByAffaire } from '@/lib/affaires/affaire-service'

describe('Affaire Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAffaires', () => {
    it('should return { data, error?: undefined } on success', async () => {
      mockAffaireFindMany.mockResolvedValue([
        { code_affaire: 'AFF-001', intitule_affaire: 'Project A' },
        { code_affaire: 'AFF-002', intitule_affaire: 'Project B' },
      ])

      const result = await getAffaires()

      expect(result.data).toEqual(['AFF-001', 'AFF-002'])
      expect(result.error).toBeUndefined()
    })

    it('should return { data: [], error } on failure', async () => {
      mockAffaireFindMany.mockRejectedValue(new Error('DB error'))

      const result = await getAffaires()

      expect(result.data).toEqual([])
      expect(result.error).toBe('Failed to fetch affaires')
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
