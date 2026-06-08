import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    docVente: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    partenaire: {
      findUnique: vi.fn(),
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

import * as documentService from '@/lib/documents/document-service'
import { prisma } from '@/lib/db/prisma'

const rawRecord = {
  id_document: 1,
  numero_document: 'FAC-001',
  type_document: 'Facture',
  domaine_document: 'VENTE',
  etat_document: 'Saisi',
  id_partenaire: 1,
  nom_partenaire_snapshot: null,
  id_affaire: null,
  numero_affaire: null,
  date_document: new Date('2025-01-01'),
  date_echeance: null,
  date_livraison: null,
  date_livraison_prevue: null,
  montant_ht: 1000,
  montant_remise_total: 0,
  montant_tva_total: 200,
  montant_ttc: 1200,
  solde_du: 1200,
  code_devise: 'MAD',
  taux_change: 1,
  statut_document: 'BROUILLON',
  est_entierement_paye: false,
  id_entrepot: null,
  notes_internes: null,
  notes_client: null,
  reference_externe: null,
  mode_expedition: null,
  poids_total_brut: null,
  nombre_colis: null,
  date_creation: new Date('2025-01-01'),
  date_modification: new Date('2025-01-01'),
  cree_par: 'user-1',
  modifie_par: null,
}

describe('documentService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createDocument', () => {
    const validInput = {
      numero_document: 'FAC-001',
      type_document: 'Facture',
      domaine_document: 'VENTE',
      id_partenaire: 1,
      date_document: '2025-01-01T00:00:00.000Z',
      montant_ht: 1000,
      montant_ttc: 1200,
      code_devise: 'MAD',
    }

    it('creates a document and returns computed fields', async () => {
      vi.mocked(prisma.partenaire.findUnique).mockResolvedValue({ id_partenaire: 1 } as any)
      vi.mocked(prisma.docVente.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.docVente.create).mockResolvedValue(rawRecord as any)

      const result = await documentService.createDocument(validInput as any, 'user-1')

      expect(result.error).toBeUndefined()
      expect(result.data).toBeDefined()
      expect(result.data!.numero_piece).toBe('FAC-001')
      expect(result.data!.montant_ht_num).toBe(1000)
      expect(result.data!.montant_ttc_num).toBe(1200)
      expect(result.data!.montant_regle).toBe(0)
    })

    it('returns VALIDATION error for invalid input', async () => {
      const result = await documentService.createDocument({} as any, 'user-1')

      expect(result.error).toBeDefined()
      expect(result.code).toBe('VALIDATION')
      expect(result.data).toBeUndefined()
    })

    it('returns NOT_FOUND when partner does not exist', async () => {
      vi.mocked(prisma.partenaire.findUnique).mockResolvedValue(null)

      const result = await documentService.createDocument(validInput as any, 'user-1')

      expect(result.error).toBe('Partenaire introuvable')
      expect(result.code).toBe('NOT_FOUND')
      expect(result.data).toBeUndefined()
      expect(prisma.docVente.create).not.toHaveBeenCalled()
    })

    it('returns CONFLICT when numero_document already exists', async () => {
      vi.mocked(prisma.partenaire.findUnique).mockResolvedValue({ id_partenaire: 1 } as any)
      vi.mocked(prisma.docVente.findUnique).mockResolvedValue(rawRecord as any)

      const result = await documentService.createDocument(validInput as any, 'user-1')

      expect(result.error).toBe('Le document FAC-001 existe déjà')
      expect(result.code).toBe('CONFLICT')
      expect(result.data).toBeUndefined()
      expect(prisma.docVente.create).not.toHaveBeenCalled()
    })

    it('returns INTERNAL error when delegate.create throws', async () => {
      vi.mocked(prisma.partenaire.findUnique).mockResolvedValue({ id_partenaire: 1 } as any)
      vi.mocked(prisma.docVente.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.docVente.create).mockRejectedValue(new Error('DB error'))

      const result = await documentService.createDocument(validInput as any, 'user-1')

      expect(result.code).toBe('INTERNAL')
      expect(result.data).toBeUndefined()
    })
  })

  describe('updateDocument', () => {
    const updateInput = {
      montant_ht: 1500,
      montant_ttc: 1800,
    }

    const updatedRecord = { ...rawRecord, montant_ht: 1500, montant_ttc: 1800, modifie_par: 'user-1' }

    it('updates a document and returns computed fields', async () => {
      vi.mocked(prisma.docVente.findUnique).mockResolvedValue(rawRecord as any)
      vi.mocked(prisma.docVente.update).mockResolvedValue(updatedRecord as any)

      const result = await documentService.updateDocument(1, updateInput as any, 'user-1')

      expect(result.error).toBeUndefined()
      expect(result.data).toBeDefined()
      expect(result.data!.montant_ht_num).toBe(1500)
      expect(result.data!.montant_ttc_num).toBe(1800)
    })

    it('returns NOT_FOUND when document does not exist', async () => {
      vi.mocked(prisma.docVente.findUnique).mockResolvedValue(null)

      const result = await documentService.updateDocument(999, updateInput as any, 'user-1')

      expect(result.error).toContain('introuvable')
      expect(result.code).toBe('NOT_FOUND')
      expect(result.data).toBeUndefined()
      expect(prisma.docVente.update).not.toHaveBeenCalled()
    })

    it('returns VALIDATION error for invalid input', async () => {
      const result = await documentService.updateDocument(1, { id_partenaire: -1 } as any, 'user-1')

      expect(result.error).toBeDefined()
      expect(result.code).toBe('VALIDATION')
      expect(result.data).toBeUndefined()
    })

    it('returns CONFLICT when changing numero_document to an existing one', async () => {
      const existingRecord = { ...rawRecord, numero_document: 'FAC-001' }
      const conflictRecord = { ...rawRecord, id_document: 2, numero_document: 'FAC-002' }
      vi.mocked(prisma.docVente.findUnique)
        .mockResolvedValueOnce(existingRecord as any)
        .mockResolvedValueOnce(conflictRecord as any)

      const result = await documentService.updateDocument(1, { numero_document: 'FAC-002' } as any, 'user-1')

      expect(result.error).toBe('Le document FAC-002 existe déjà')
      expect(result.code).toBe('CONFLICT')
      expect(result.data).toBeUndefined()
      expect(prisma.docVente.update).not.toHaveBeenCalled()
    })

    it('returns INTERNAL error when delegate.update throws', async () => {
      vi.mocked(prisma.docVente.findUnique).mockResolvedValue(rawRecord as any)
      vi.mocked(prisma.docVente.update).mockRejectedValue(new Error('DB error'))

      const result = await documentService.updateDocument(1, updateInput as any, 'user-1')

      expect(result.code).toBe('INTERNAL')
      expect(result.data).toBeUndefined()
    })
  })
})
