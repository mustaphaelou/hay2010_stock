import { pdf } from '@react-pdf/renderer'
import { InvoiceDocument, InvoiceData, InvoiceLineItem } from './invoice-template'
import type { FDocentete, FDocligne, FComptet } from '@/lib/supabase/types'

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
    '0': { // Ventes
        0: 'Devis',
        1: 'Bon de Commande',
        2: 'Préparation Livraison',
        3: 'Bon de Livraison',
        4: 'Retour',
        5: 'Avoir',
        6: 'Facture',
        7: 'Avoir Financier',
    },
    '1': { // Achats
        0: 'Demande Achat',
        1: 'Bon de Commande',
        2: 'Préparation Commande',
        3: 'Bon de Réception',
        4: 'Retour',
        5: 'Avoir',
        6: 'Facture Achat',
        7: 'Avoir Financier',
    },
}

/**
 * Format a date string to French locale
 */
function formatDateFR(dateStr: string | null): string {
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
function getPaymentStatus(doc: FDocentete): 'paid' | 'partial' | 'pending' {
    const paid = doc.do_montregl || 0
    const total = doc.do_totalttc || 0

    if (paid >= total && total > 0) return 'paid'
    if (paid > 0 && paid < total) return 'partial'
    return 'pending'
}

/**
 * Transform Sage document + lines into InvoiceData format
 */
export function transformToInvoiceData(
    document: FDocentete,
    lines: FDocligne[],
    partner?: FComptet | null,
    options?: {
        showWatermark?: boolean
        watermarkText?: string
    }
): InvoiceData {
    // Map lines to invoice items
    const invoiceLines: InvoiceLineItem[] = lines.map(line => ({
        reference: line.ar_ref || '-',
        designation: line.dl_design || '-',
        quantity: line.dl_qte || 0,
        unitPrice: line.dl_prixunitaire || 0,
        discount: line.dl_remise01_montant || 0,
        total: line.dl_montantht || 0,
        taxCode: line.ta_code || 'D20',
    }))

    // Get document type name
    const domaine = document.do_domaine.toString()
    const typeName = DOCUMENT_TYPE_NAMES[domaine]?.[document.do_type] || `Document ${document.do_type}`

    // Calculate totals
    const totalTTC = document.do_totalttc || 0
    const totalHT = document.do_totalht || (totalTTC / 1.20)
    const totalTVA = document.do_tva || (totalTTC - totalHT)

    return {
        // Document info
        documentNumber: document.do_piece,
        documentType: typeName,
        date: formatDateFR(document.do_date),
        devisNumber: document.do_ref || undefined,

        // Company
        company: COMPANY_INFO,

        // Client
        client: {
            name: partner?.ct_intitule || document.do_tiers || 'Client',
            address: partner?.ct_adresse || undefined,
            city: partner?.ct_ville || undefined,
            postalCode: partner?.ct_codepostal || undefined,
            country: partner?.ct_pays || 'Maroc',
            ice: partner?.ct_identifiant || undefined,
            phone: partner?.ct_telephone || undefined,
            fax: partner?.ct_telecopie || undefined,
            email: partner?.ct_email || undefined,
        },

        // Contact
        contactName: partner?.ct_contact || undefined,
        contactRole: partner?.ct_qualite || undefined,

        // Lines
        lines: invoiceLines,

        // Totals
        subtotal: totalHT,
        discount: document.do_escompte || 0,
        taxAmount: totalTVA,
        total: totalTTC,
        amountPaid: document.do_montregl || 0,

        // Payment
        paymentStatus: getPaymentStatus(document),
        paymentTerms: 'Paiement à 30 jours',

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
    document: FDocentete,
    lines: FDocligne[],
    partner?: FComptet | null,
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
