import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as documentsModule from '@/app/actions/documents'
import { prisma } from '@/lib/db/prisma'

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    docVente: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    ligneDocument: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth/user-utils', () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: 'user-1', role: 'USER' }),
}))

describe('Document Actions', () => {
  const mockDocument = {
    id_document: 1,
    numero_document: 'DOC-001',
    type_document: 'FACTURE',
    domaine_document: 'VENTE',
    etat_document: 'VALIDE',
    id_partenaire: 1,
    nom_partenaire_snapshot: 'Partner 1',
    id_affaire: null,
    numero_affaire: null,
    date_document: new Date('2024-01-15'),
    date_echeance: new Date('2024-02-15'),
    date_livraison: null,
    date_livraison_prevue: null,
    montant_ht: 1000,
    montant_remise_total: 0,
    montant_tva_total: 200,
    montant_ttc: 1200,
    solde_du: 1200,
    code_devise: 'EUR',
    taux_change: 1,
    statut_document: '1',
    est_entierement_paye: false,
    id_entrepot: null,
    notes_internes: null,
    notes_client: null,
    reference_externe: null,
    date_creation: new Date('2024-01-15'),
    date_modification: new Date('2024-01-15'),
    cree_par: 'user-1',
    modifie_par: null,
    mode_expedition: null,
    poids_total_brut: null,
    nombre_colis: null,
    partenaire: {
      nom_partenaire: 'Partner 1',
      type_partenaire: 'CLIENT',
    },
  }

  const mockDocumentLine = {
    id_ligne: 1,
    id_document: 1,
    numero_ligne: 1,
    id_produit: 1,
    code_produit_snapshot: 'PROD-001',
    nom_produit_snapshot: 'Product 1',
    quantite_commandee: 5,
    quantite_livree: 0,
    prix_unitaire_ht: 100,
    montant_ht: 500,
    montant_tva: 100,
    montant_ttc: 600,
    produit: {
      nom_produit: 'Product 1',
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getDocuments', () => {
    it('should fetch paginated documents', async () => {
      ;(prisma.docVente.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockDocument])
      ;(prisma.docVente.count as ReturnType<typeof vi.fn>).mockResolvedValue(1)

      const result = await documentsModule.getDocuments(1, 50)

      expect(result.data).toHaveLength(1)
      expect(result.meta.total).toBe(1)
    })

    it('should calculate correct pagination skip', async () => {
      ;(prisma.docVente.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
      ;(prisma.docVente.count as ReturnType<typeof vi.fn>).mockResolvedValue(100)

      await documentsModule.getDocuments(3, 20)

      expect(prisma.docVente.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40,
          take: 20,
        })
      )
    })

    it('should map document to computed fields', async () => {
      ;(prisma.docVente.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockDocument])
      ;(prisma.docVente.count as ReturnType<typeof vi.fn>).mockResolvedValue(1)

      const result = await documentsModule.getDocuments(1, 50)

      const doc = result.data[0]
      expect(doc.montant_ht_num).toBe(1000)
      expect(doc.montant_ttc_num).toBe(1200)
    })

    it('should handle errors gracefully', async () => {
      ;(prisma.docVente.findMany as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB error'))

      const result = await documentsModule.getDocuments(1, 50)

      expect(result.data).toEqual([])
      expect(result.error).toBe('Failed to fetch documents')
    })
  })

  describe('getSalesDocuments', () => {
    it('should filter by domaine_document VENTE', async () => {
      ;(prisma.docVente.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockDocument])
      ;(prisma.docVente.count as ReturnType<typeof vi.fn>).mockResolvedValue(1)

      await documentsModule.getSalesDocuments(1, 50)

      expect(prisma.docVente.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { domaine_document: 'VENTE' },
        })
      )
    })
  })

  describe('getPurchasesDocuments', () => {
    it('should filter by domaine_document ACHAT', async () => {
      ;(prisma.docVente.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockDocument])
      ;(prisma.docVente.count as ReturnType<typeof vi.fn>).mockResolvedValue(1)

      await documentsModule.getPurchasesDocuments(1, 50)

      expect(prisma.docVente.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { domaine_document: 'ACHAT' },
        })
      )
    })
  })

  describe('getDocLines', () => {
    it('should fetch document lines for valid docId', async () => {
      ;(prisma.ligneDocument.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockDocumentLine])

      const result = await documentsModule.getDocLines(1)

      expect(result.data).toHaveLength(1)
    })

    it('should validate docId is positive', async () => {
      const result = await documentsModule.getDocLines(0)

      expect(result.error).toBe('Invalid document ID')
      expect(result.data).toEqual([])
    })
  })
})
