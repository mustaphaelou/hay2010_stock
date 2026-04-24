import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { verifyToken } from '@/lib/auth/jwt'
import { AUTH_COOKIE_NAME } from '@/lib/constants/auth'
import { generateInvoicePdfBuffer, transformToInvoiceData } from '@/lib/pdf/generate-invoice-server'
import { createLogger } from '@/lib/logger'

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

    const documentWithComputed = {
      ...document,
      montant_ht_num: Number(document.montant_ht || 0),
      montant_ttc_num: Number(document.montant_ttc || 0),
      solde_du_num: Number(document.solde_du || 0),
      montant_regle: Number(document.montant_ttc || 0) - Number(document.solde_du || 0),
      numero_piece: document.numero_document,
      nom_tiers: document.nom_partenaire_snapshot || document.partenaire?.nom_partenaire || null,
      reference: document.reference_externe || null,
      montant_tva_num: Number(document.montant_tva_total || 0),
      montant_remise_num: Number(document.montant_remise_total || 0),
      type_document_num: Number(document.type_document || 0),
      statut_document_num: Number(document.statut_document || 0),
      domaine: document.domaine_document,
    }

    const linesWithComputed = document.lignes.map((line) => ({
      ...line,
      quantite: Number(line.quantite_commandee || 0),
      prix_unitaire: Number(line.prix_unitaire_ht || 0),
      montant_ht_num: Number(line.montant_ht || 0),
      montant_ttc_num: Number(line.montant_ttc || 0),
      designation: line.nom_produit_snapshot || line.produit?.nom_produit || null,
      reference_article: line.code_produit_snapshot || null,
      ordre: line.numero_ligne,
      code_taxe: null as string | null,
    }))

    const invoiceData = transformToInvoiceData(documentWithComputed, linesWithComputed, document.partenaire)
    const pdfBuffer = await generateInvoicePdfBuffer(invoiceData)

    const filename = `${invoiceData.documentType.replace(/\s/g, '_')}_${invoiceData.documentNumber}.pdf`

    return new NextResponse(pdfBuffer, {
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
