import type { InvoiceData, InvoiceLineItem, InvoiceCompany } from './invoice-template'
export type { InvoiceData, InvoiceLineItem, InvoiceCompany }
import type { DocumentWithComputed, DocumentLine as DocumentLineType } from '@/lib/types'

type DocumentWithPartner = DocumentWithComputed

// Minimal partner info interface
interface PartnerInfo {
  nom_partenaire?: string | null
  adresse_rue?: string | null
  ville?: string | null
  code_postal?: string | null
  pays?: string | null
  numero_ice?: string | null
  numero_telephone?: string | null
  numero_fax?: string | null
  adresse_email?: string | null
}

// Company info - can be customized or fetched from settings
const COMPANY_INFO = {
  name: 'HAY2010',
  tagline: 'Travaux d\'électrification & Eclairage public',
  address: 'MAG N° 21 HAY EL MENZAH CYM',
  city: 'RABAT',
  postalCode: '',
  country: 'Maroc',
  phone: '05 37 28 11 11',
  email: 'ste.hay2010@gmail.com',
  ice: '001459327000056',
  rc: '87305',
}

// Document type mapping
const DOCUMENT_TYPE_NAMES: Record<string, Record<string, string>> = {
  'VENTE': {
    '0': 'Devis',
    '1': 'Bon de Commande',
    '2': 'Préparation Livraison',
    '3': 'Bon de Livraison',
    '4': 'Retour',
    '5': 'Avoir',
    '6': 'Facture',
    '7': 'Avoir Financier',
  },
  'ACHAT': {
    '10': 'Demande Achat',
    '11': 'Préparation Commande',
    '12': 'Bon de Commande',
    '13': 'Bon de Réception',
    '14': 'Retour',
    '15': 'Avoir',
    '16': 'Facture Achat',
    '17': 'Avoir Financier',
  },
}

/**
 * Format a date string to French locale
 */
function formatDateFR(dateStr: Date | string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Determine payment status from document data
 */
function getPaymentStatus(doc: DocumentWithPartner): 'paid' | 'partial' | 'pending' {
  const paid = Number(doc.montant_regle || 0)
  const total = Number(doc.montant_ttc_num || 0)

  if (paid >= total && total > 0) return 'paid'
  if (paid > 0 && paid < total) return 'partial'
  return 'pending'
}

/**
 * Transform Prisma document + lines into InvoiceData format
 */
export function transformToInvoiceData(
  document: DocumentWithPartner,
  lines: DocumentLineType[],
  partner?: PartnerInfo | null,
  options?: {
    showWatermark?: boolean
    watermarkText?: string
  }
): InvoiceData {
  // Map lines to invoice items
  const invoiceLines: InvoiceLineItem[] = lines.map((line: DocumentLineType) => ({
    reference: line.reference_article || '-',
    designation: line.designation || line.produit?.nom_produit || '-',
    quantity: Number(line.quantite || 0),
    unitPrice: Number(line.prix_unitaire || 0),
    discount: Number(line.montant_remise || 0),
    total: Number(line.montant_ht || 0),
    taxCode: 'D20',
  }))

  // Get document type name
  const domaine = document.domaine_document || 'VENTE'
  const typeName = DOCUMENT_TYPE_NAMES[domaine]?.[String(document.type_document)] || `Document ${document.type_document}`

  // Calculate totals
  const totalTTC = Number(document.montant_ttc_num || 0)
  const totalHT = Number(document.montant_ht_num || (totalTTC / 1.20))
  const totalTVA = Number(document.montant_tva_num || (totalTTC - totalHT))

  return {
    // Document info
    documentNumber: document.numero_piece || document.numero_document,
    documentType: typeName,
    date: formatDateFR(document.date_document),
    devisNumber: document.reference_externe || document.reference || undefined,

    // Company
    company: COMPANY_INFO,

    // Client
    client: {
      name: partner?.nom_partenaire || document.nom_tiers || document.nom_partenaire_snapshot || 'Client',
      address: partner?.adresse_rue || undefined,
      city: partner?.ville || undefined,
      postalCode: partner?.code_postal || undefined,
      country: partner?.pays || 'Maroc',
      ice: partner?.numero_ice || undefined,
      phone: partner?.numero_telephone || undefined,
      fax: partner?.numero_fax || undefined,
      email: partner?.adresse_email || undefined,
    },

    // Contact
    contactName: undefined,
    contactRole: undefined,

    // Lines
    lines: invoiceLines,

    // Totals
    subtotal: totalHT,
    discount: Number(document.montant_remise_num || 0),
    taxAmount: totalTVA,
    total: totalTTC,
    amountPaid: Number(document.montant_regle || 0),

    // Payment
    paymentStatus: getPaymentStatus(document),
    paymentTerms: 'Paiement à 30 jours',

    // Watermark - always show DUPLICATA for generated copies
    showWatermark: options?.showWatermark ?? true,
    watermarkText: options?.watermarkText ?? 'DUPLICATA',
  }
}

/**
 * Generate PDF buffer from invoice data (for server-side use)
 */
export async function generateInvoicePdfBuffer(data: InvoiceData): Promise<Buffer> {
  const [{ pdf }, { InvoiceDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("./invoice-template"),
  ])
  const doc = <InvoiceDocument data={data} />
  const buffer = await pdf(doc).toBuffer()
  return Buffer.from(buffer as unknown as ArrayBuffer)
}

/**
 * Generate PDF blob from invoice data
 */
export async function generateInvoicePDF(data: InvoiceData): Promise<Blob> {
  const [{ pdf }, { InvoiceDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./invoice-template'),
  ])
  const doc = <InvoiceDocument data={data} />
  const blob = await pdf(doc).toBlob()
  return blob
}

/**
 * Generate and download PDF for a document
 */
export async function downloadInvoicePDF(
  document: DocumentWithPartner,
  lines: DocumentLineType[],
  partner?: PartnerInfo | null,
  options?: {
    showWatermark?: boolean
    watermarkText?: string
  }
): Promise<void> {
  const invoiceData = transformToInvoiceData(document, lines, partner, options)
  const blob = await generateInvoicePDF(invoiceData)

  // Create download link
  const url = URL.createObjectURL(blob)
  const link = window.document.createElement('a')
  link.href = url
  link.download = `${invoiceData.documentType.replace(/\s/g, '_')}_${invoiceData.documentNumber}.pdf`
  window.document.body.appendChild(link)
  link.click()
  window.document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Generate PDF as base64 string (for email attachments, etc.)
 */
export async function generateInvoicePDFBase64(data: InvoiceData): Promise<string> {
  const blob = await generateInvoicePDF(data)
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result
      if (!result || typeof result !== 'string') {
        reject(new Error('Failed to read PDF data: result is null or invalid'))
        return
      }
      const base64 = result.split(',')[1]
      if (!base64) {
        reject(new Error('Invalid base64 data: no data URL prefix found'))
        return
      }
      resolve(base64)
    }
    reader.onerror = () => {
      reject(new Error('FileReader error while reading PDF blob'))
    }
    reader.readAsDataURL(blob)
  })
}
