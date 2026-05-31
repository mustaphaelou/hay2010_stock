import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockRequireAuth } = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
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

vi.mock('@/lib/auth/user-utils', () => ({
  requireAuth: mockRequireAuth,
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

function createRequest(): NextRequest {
  return new NextRequest('http://localhost/api/invoices/1')
}

describe('Invoice API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDocVenteFindUnique.mockResolvedValue(null)
    mockGenerateInvoicePdfBuffer.mockResolvedValue(Buffer.from('pdf-data'))
    mockTransformToInvoiceData.mockReturnValue({
      documentNumber: 'INV-001',
      documentType: 'Facture',
    })
  })

  it('should return 401 when no auth', async () => {
    mockRequireAuth.mockRejectedValue(new Error('Unauthorized'))

    const req = createRequest()
    const response = await GET(req, { params: Promise.resolve({ id: '1' }) })

    expect(response.status).toBe(401)
  })

  it('should return 401 when token is invalid', async () => {
    mockRequireAuth.mockRejectedValue(new Error('Unauthorized'))

    const req = createRequest()
    const response = await GET(req, { params: Promise.resolve({ id: '1' }) })

    expect(response.status).toBe(401)
  })

  it('should return 400 for non-numeric ID', async () => {
    mockRequireAuth.mockResolvedValue({ id: 'user-1', email: 'test@test.com', name: 'Test', role: 'ADMIN' })

    const req = createRequest()
    const response = await GET(req, { params: Promise.resolve({ id: 'not-a-number' }) })

    expect(response.status).toBe(400)
  })

  it('should return 404 when document not found', async () => {
    mockRequireAuth.mockResolvedValue({ id: 'user-1', email: 'test@test.com', name: 'Test', role: 'ADMIN' })
    mockDocVenteFindUnique.mockResolvedValue(null)

    const req = createRequest()
    const response = await GET(req, { params: Promise.resolve({ id: '999' }) })

    expect(response.status).toBe(404)
  })

  it('should return 403 for non-admin non-owner user', async () => {
    mockRequireAuth.mockResolvedValue({ id: 'user-2', email: 'other@test.com', name: 'Other', role: 'USER' })
    mockDocVenteFindUnique.mockResolvedValue({
      id_document: 1,
      cree_par: 'user-1',
      lignes: [],
    })

    const req = createRequest()
    const response = await GET(req, { params: Promise.resolve({ id: '1' }) })

    expect(response.status).toBe(403)
  })

  it('should return PDF for admin user', async () => {
    mockRequireAuth.mockResolvedValue({ id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' })
    mockDocVenteFindUnique.mockResolvedValue({
      id_document: 1,
      cree_par: 'user-2',
      partenaire: { nom_partenaire: 'Test Corp', type_partenaire: 'CLIENT' },
      lignes: [],
    })

    const req = createRequest()
    const response = await GET(req, { params: Promise.resolve({ id: '1' }) })

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/pdf')
    expect(response.headers.get('Content-Disposition')).toContain('attachment')
  })

  it('should allow owner to access their document', async () => {
    mockRequireAuth.mockResolvedValue({ id: 'user-1', email: 'owner@test.com', name: 'Owner', role: 'USER' })
    mockDocVenteFindUnique.mockResolvedValue({
      id_document: 1,
      cree_par: 'user-1',
      partenaire: { nom_partenaire: 'Test Corp', type_partenaire: 'CLIENT' },
      lignes: [],
    })

    const req = createRequest()
    const response = await GET(req, { params: Promise.resolve({ id: '1' }) })

    expect(response.status).toBe(200)
  })
})
