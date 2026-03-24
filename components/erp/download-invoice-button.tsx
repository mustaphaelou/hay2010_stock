'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { HugeiconsIcon } from '@hugeicons/react'
import { FileDownloadIcon, Loading01Icon } from '@hugeicons/core-free-icons'
import { downloadInvoicePDF } from '@/lib/pdf'
import type { DocumentWithPartner, DocumentLineType } from '@/app/actions/documents'
import { getDocLines } from '@/app/actions/documents'

// Define a minimal partner type for the component
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

interface DownloadInvoiceButtonProps {
  document: DocumentWithPartner
  partner?: PartnerInfo | null
  variant?: 'default' | 'ghost' | 'outline' | 'secondary'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

export function DownloadInvoiceButton({
    document,
    partner,
    variant = 'outline',
    size = 'sm',
    className,
}: DownloadInvoiceButtonProps) {
    const [loading, setLoading] = useState(false)

    const handleDownload = async () => {
        try {
            setLoading(true)

            // Fetch document lines using Server Action
            const lines = await getDocLines(document.id_document)

            // Generate and download PDF
            await downloadInvoicePDF(document, lines || [], partner)
        } catch (err) {
            console.error('Error generating PDF:', err)
            alert('Erreur lors de la génération du PDF')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button
            variant={variant}
            size={size}
            onClick={handleDownload}
            disabled={loading}
            className={className}
            aria-label="Télécharger le PDF"
        >
            {loading ? (
                <HugeiconsIcon icon={Loading01Icon} className="h-4 w-4 animate-spin" />
            ) : (
                <HugeiconsIcon icon={FileDownloadIcon} className="h-4 w-4" />
            )}
            {size !== 'icon' && <span className="ml-2">PDF</span>}
        </Button>
    )
}
