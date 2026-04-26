import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockVerifyToken } = vi.hoisted(() => ({
  mockVerifyToken: vi.fn(),
}))

const { mockDocVenteFindUnique } = vi.hoisted(() => ({
  mockDocVenteFindUnique: vi.fn(),
}))

const { mockGenerateInvoicePdfBuffer, mockTransformToInvoiceData } = vi.hoisted(() => ({
  mockGenerateInvoicePdfBuffer: vi.fn().mockResolvedValue(Buffer.from('pdf-data')),
  mockTransformToInvoiceData: vi.fn().mockReturnValue({
    documentNumber: 'INV-001',
    documentType: 'Facture',
  }),
}))

vi.mock('@/lib/auth/jwt', () => ({
  verifyToken: mockVerifyToken,
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    docVente: { findUnique: mockDocVenteFindUnique },
  },
}))

vi.mock('@/lib/pdf/generate-invoice', () => ({
  generateInvoicePdfBuffer: mockGenerateInvoicePdfBuffer,
  transformToInvoiceData: mockTransformToInvoiceData,
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

import { GET } from '@/app/api/invoices/[id]/route'

function createRequest(cookieValue?: string): NextRequest {
  const req = new NextRequest('http://localhost/api/invoices/1')
  if (cookieValue) {
    req.cookies.set('auth_token', cookieValue)
  }
  return req
}

describe('Invoice API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockVerifyToken.mockResolvedValue({ userId: 'user-1', role: 'ADMIN', sessionId: 'sess-1' })
    mockDocVenteFindUnique.mockResolvedValue(null)
    mockGenerateInvoicePdfBuffer.mockResolvedValue(Buffer.from('pdf-data'))
    mockTransformToInvoiceData.mockReturnValue({
      documentNumber: 'INV-001',
      documentType: 'Facture',
    })
  })

  it('should return 401 when no auth token', async () => {
    const req = createRequest()
    const response = await GET(req, { params: Promise.resolve({ id: '1' }) })

    expect(response.status).toBe(401)
  })

  it('should return 401 when token is invalid', async () => {
    mockVerifyToken.mockResolvedValue(null)
    const req = createRequest('invalid-token')
    const response = await GET(req, { params: Promise.resolve({ id: '1' }) })

    expect(response.status).toBe(401)
  })

  it('should return 400 for invalid document ID', async () => {
    const req = createRequest('valid-token')
    const response = await GET(req, { params: Promise.resolve({ id: 'not-a-number' }) })

    expect(response.status).toBe(400)
  })

  it('should return 404 when document not found', async () => {
    mockDocVenteFindUnique.mockResolvedValue(null)
    const req = createRequest('valid-token')
    const response = await GET(req, { params: Promise.resolve({ id: '999' }) })

    expect(response.status).toBe(404)
  })

  it('should return 403 for non-admin non-owner user', async () => {
    mockVerifyToken.mockResolvedValue({ userId: 'user-2', role: 'VIEWER', sessionId: 'sess-2' })
    mockDocVenteFindUnique.mockResolvedValue({
      id_document: 1,
      cree_par: 'user-3',
      montant_ht: 100,
      montant_ttc: 120,
      solde_du: 0,
      montant_tva_total: 20,
      montant_remise_total: 0,
      type_document: 1,
      statut_document: 1,
      numero_document: 'INV-001',
      domaine_document: 'VENTE',
      reference_externe: null,
      nom_partenaire_snapshot: 'Client',
      lignes: [],
      partenaire: { nom_partenaire: 'Client' },
    })

    const req = createRequest('valid-token')
    const response = await GET(req, { params: Promise.resolve({ id: '1' }) })

    expect(response.status).toBe(403)
  })

  it('should return PDF for admin user', async () => {
    mockDocVenteFindUnique.mockResolvedValue({
      id_document: 1,
      cree_par: 'other-user',
      montant_ht: 100,
      montant_ttc: 120,
      solde_du: 0,
      montant_tva_total: 20,
      montant_remise_total: 0,
      type_document: 1,
      statut_document: 1,
      numero_document: 'INV-001',
      domaine_document: 'VENTE',
      reference_externe: null,
      nom_partenaire_snapshot: 'Client',
      lignes: [],
      partenaire: { nom_partenaire: 'Client' },
    })

    const req = createRequest('valid-token')
    const response = await GET(req, { params: Promise.resolve({ id: '1' }) })

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/pdf')
    expect(response.headers.get('Content-Disposition')).toContain('attachment')
  })

  it('should allow owner to access their document', async () => {
    mockVerifyToken.mockResolvedValue({ userId: 'user-1', role: 'USER', sessionId: 'sess-1' })
    mockDocVenteFindUnique.mockResolvedValue({
      id_document: 1,
      cree_par: 'user-1',
      montant_ht: 100,
      montant_ttc: 120,
      solde_du: 0,
      montant_tva_total: 20,
      montant_remise_total: 0,
      type_document: 1,
      statut_document: 1,
      numero_document: 'INV-001',
      domaine_document: 'VENTE',
      reference_externe: null,
      nom_partenaire_snapshot: 'Client',
      lignes: [],
      partenaire: { nom_partenaire: 'Client' },
    })

    const req = createRequest('valid-token')
    const response = await GET(req, { params: Promise.resolve({ id: '1' }) })

    expect(response.status).toBe(200)
  })

  it('should return 500 on PDF generation failure', async () => {
    mockDocVenteFindUnique.mockResolvedValue({
      id_document: 1,
      cree_par: 'user-1',
      montant_ht: 100,
      montant_ttc: 120,
      solde_du: 0,
      montant_tva_total: 20,
      montant_remise_total: 0,
      type_document: 1,
      statut_document: 1,
      numero_document: 'INV-001',
      domaine_document: 'VENTE',
      reference_externe: null,
      nom_partenaire_snapshot: 'Client',
      lignes: [],
      partenaire: { nom_partenaire: 'Client' },
    })
    mockGenerateInvoicePdfBuffer.mockRejectedValue(new Error('PDF error'))

    const req = createRequest('valid-token')
    const response = await GET(req, { params: Promise.resolve({ id: '1' }) })

    expect(response.status).toBe(500)
  })
})
