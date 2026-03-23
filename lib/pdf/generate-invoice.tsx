import { pdf } from '@react-pdf/renderer'
import { InvoiceDocument, InvoiceData, InvoiceLineItem } from './invoice-template'
import type { DocumentWithPartner, DocumentLine } from '@/app/actions/documents'
import type { Partenaire } from '@prisma/client'

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
const DOCUMENT_TYPE_NAMES: Record<string, Record<number, string>> = {
    'VENTE': {
        0: 'Devis',
        1: 'Bon de Commande',
        2: 'Préparation Livraison',
        3: 'Bon de Livraison',
        4: 'Retour',
        5: 'Avoir',
        6: 'Facture',
        7: 'Avoir Financier',
    },
    'ACHAT': {
        10: 'Demande Achat',
        11: 'Préparation Commande',
        12: 'Bon de Commande',
        13: 'Bon de Réception',
        14: 'Retour',
        15: 'Avoir',
        16: 'Facture Achat',
        17: 'Avoir Financier',
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
    const total = Number(doc.montant_ttc || 0)

    if (paid >= total && total > 0) return 'paid'
    if (paid > 0 && paid < total) return 'partial'
    return 'pending'
}

/**
 * Transform Prisma document + lines into InvoiceData format
 */
export function transformToInvoiceData(
    document: DocumentWithPartner,
    lines: DocumentLine[],
    partner?: Partenaire | null,
    options?: {
        showWatermark?: boolean
        watermarkText?: string
    }
): InvoiceData {
    // Map lines to invoice items
    const invoiceLines: InvoiceLineItem[] = lines.map(line => ({
        reference: line.reference_article || '-',
        designation: line.designation || line.produit?.designation || '-',
        quantity: Number(line.quantite || 0),
        unitPrice: Number(line.prix_unitaire || 0),
        discount: Number(line.montant_remise || 0),
        total: Number(line.montant_ht || 0),
        taxCode: line.code_taxe || 'D20',
    }))

    // Get document type name
    const domaine = document.domaine_document || 'VENTE'
    const typeName = DOCUMENT_TYPE_NAMES[domaine]?.[document.type_document || 0] || `Document ${document.type_document}`

    // Calculate totals
    const totalTTC = Number(document.montant_ttc || 0)
    const totalHT = Number(document.montant_ht || (totalTTC / 1.20))
    const totalTVA = Number(document.montant_tva || (totalTTC - totalHT))

    return {
        // Document info
        documentNumber: document.numero_piece,
        documentType: typeName,
        date: formatDateFR(document.date_document),
        devisNumber: document.reference || undefined,

        // Company
        company: COMPANY_INFO,

        // Client
        client: {
            name: partner?.nom_partenaire || document.nom_tiers || 'Client',
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
        contactName: undefined, // Add if you store this specifically
        contactRole: undefined,

        // Lines
        lines: invoiceLines,

        // Totals
        subtotal: totalHT,
        discount: Number(document.montant_remise || 0),
        taxAmount: totalTVA,
        total: totalTTC,
        amountPaid: Number(document.montant_regle || 0),

        // Payment
        paymentStatus: getPaymentStatus(document),
        paymentTerms: 'Paiement à 30 jours', // Could be dynamic from partner details

        // Watermark - always show DUPLICATA for generated copies
        showWatermark: options?.showWatermark ?? true,
        watermarkText: options?.watermarkText ?? 'DUPLICATA',
    }
}

/**
 * Generate PDF blob from invoice data
 */
export async function generateInvoicePDF(data: InvoiceData): Promise<Blob> {
    const doc = <InvoiceDocument data={data} />
    const blob = await pdf(doc).toBlob()
    return blob
}

/**
 * Generate and download PDF for a document
 */
export async function downloadInvoicePDF(
    document: DocumentWithPartner,
    lines: DocumentLine[],
    partner?: Partenaire | null,
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
            const base64 = (reader.result as string).split(',')[1]
            resolve(base64)
        }
        reader.onerror = reject
        reader.readAsDataURL(blob)
    })
}
