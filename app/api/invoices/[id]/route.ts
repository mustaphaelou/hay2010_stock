import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { verifyToken } from '@/lib/auth/jwt'
import { AUTH_COOKIE_NAME } from '@/lib/constants/auth'
import { generateInvoicePdfBuffer, transformToInvoiceData } from '@/lib/pdf/generate-invoice'
import { createLogger } from '@/lib/logger'
import { mapDocumentToComputed, mapLineToDocumentLine } from '@/lib/documents/mapping'

const log = createLogger('invoice-api')

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    const { id } = await params
    const documentId = parseInt(id, 10)
    if (isNaN(documentId)) {
      return NextResponse.json({ error: 'Invalid document ID' }, { status: 400 })
    }

    const document = await prisma.docVente.findUnique({
      where: { id_document: documentId },
      include: {
        partenaire: true,
        lignes: { include: { produit: true } },
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (payload.role !== 'ADMIN' && payload.role !== 'MANAGER' && document.cree_par !== payload.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const documentWithComputed = mapDocumentToComputed(document)
    const linesWithComputed = document.lignes.map(mapLineToDocumentLine)

    const invoiceData = transformToInvoiceData(documentWithComputed, linesWithComputed, document.partenaire)
    const pdfBuffer = await generateInvoicePdfBuffer(invoiceData)

    const filename = `${invoiceData.documentType.replace(/\s/g, '_')}_${invoiceData.documentNumber}.pdf`

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    log.error({ error }, 'Failed to generate invoice PDF')
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
