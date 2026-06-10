import { describe, it, expect, vi, beforeEach } from 'vitest'
import { formatSoldeCourant, formatPlafondCredit, computePartnerBalance } from '@/lib/partners/partner-display'

const { mockDocVenteGroupBy } = vi.hoisted(() => ({
  mockDocVenteGroupBy: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    docVente: {
      groupBy: mockDocVenteGroupBy,
    },
  },
}))

describe('formatSoldeCourant', () => {
  it('should return "0.00 Dhs" for null', () => {
    expect(formatSoldeCourant(null)).toBe('0.00 Dhs')
  })

  it('should return "0.00 Dhs" for undefined', () => {
    expect(formatSoldeCourant(undefined)).toBe('0.00 Dhs')
  })

  it('should return "0 Dhs" when solde is 0', () => {
    expect(formatSoldeCourant(0)).toBe('0 Dhs')
  })

  it('should return formatted positive balance', () => {
    expect(formatSoldeCourant(1500)).toBe('1500 Dhs')
  })

  it('should return formatted negative balance', () => {
    expect(formatSoldeCourant(-300)).toBe('-300 Dhs')
  })
})

describe('formatPlafondCredit', () => {
  it('should return "Non défini" for null', () => {
    expect(formatPlafondCredit(null)).toBe('Non défini')
  })

  it('should return "Non défini" for undefined', () => {
    expect(formatPlafondCredit(undefined)).toBe('Non défini')
  })

  it('should return "0 Dhs" when plafond is 0', () => {
    expect(formatPlafondCredit(0)).toBe('0 Dhs')
  })

  it('should return formatted credit limit', () => {
    expect(formatPlafondCredit(5000)).toBe('5000 Dhs')
  })
})

describe('computePartnerBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 0 when there are no invoices', async () => {
    mockDocVenteGroupBy.mockResolvedValue([])
    const balance = await computePartnerBalance(1)
    expect(balance).toBe(0)
    expect(mockDocVenteGroupBy).toHaveBeenCalledWith({
      by: ['type_document'],
      where: {
        id_partenaire: 1,
        domaine_document: 'VENTE',
        type_document: { in: ['Facture', 'Avoir', 'FACTURE', 'AVOIR'] },
        statut_document: { notIn: ['ANNULE', 'BROUILLON'] },
        solde_du: { gt: 0 },
      },
      _sum: {
        solde_du: true,
      },
    })
  })

  it('should sum Factures and subtract Avoirs correctly', async () => {
    mockDocVenteGroupBy.mockResolvedValue([
      { type_document: 'Facture', _sum: { solde_du: 1500 } },
      { type_document: 'Avoir', _sum: { solde_du: 300 } },
    ])
    const balance = await computePartnerBalance(1)
    expect(balance).toBe(1200)
  })

  it('should handle case insensitivity of document types', async () => {
    mockDocVenteGroupBy.mockResolvedValue([
      { type_document: 'FACTURE', _sum: { solde_du: 2000 } },
      { type_document: 'AVOIR', _sum: { solde_du: 500 } },
    ])
    const balance = await computePartnerBalance(1)
    expect(balance).toBe(1500)
  })

  it('should ignore other document types', async () => {
    mockDocVenteGroupBy.mockResolvedValue([
      { type_document: 'Facture', _sum: { solde_du: 1000 } },
      { type_document: 'BonDeCommande', _sum: { solde_du: 400 } },
    ])
    const balance = await computePartnerBalance(1)
    expect(balance).toBe(1000)
  })
})
