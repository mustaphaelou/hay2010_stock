import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/user-utils'
import { generateInvoicePdfBuffer, transformToInvoiceData } from '@/lib/pdf/generate-invoice'
import { createLogger } from '@/lib/logger'
import { getDocumentWithLinesAndPartner } from '@/lib/documents/document-service'

const log = createLogger('invoice-api')

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()

    const { id } = await params
    const documentId = parseInt(id, 10)
    if (isNaN(documentId)) {
      return NextResponse.json({ error: 'Invalid document ID' }, { status: 400 })
    }

    const result = await getDocumentWithLinesAndPartner(documentId)
    if (result.error) {
      if (result.code === 'NOT_FOUND') {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 })
      }
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    const { document: documentWithComputed, lignes: linesWithComputed, partenaire } = result.data!

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER' && documentWithComputed.cree_par !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const invoiceData = transformToInvoiceData(documentWithComputed, linesWithComputed, partenaire)
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
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    log.error({ error }, 'Failed to generate invoice PDF')
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
