'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { SafeIcon as HugeiconsIcon } from "@/components/ui/safe-icon"
import { FileDownloadIcon, Loading01Icon } from '@hugeicons/core-free-icons'
import type { DocumentWithPartner } from '@/app/actions/documents'

interface DownloadInvoiceButtonProps {
  document: DocumentWithPartner
  partner?: Record<string, string | null> | null
  variant?: 'default' | 'ghost' | 'outline' | 'secondary'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

export function DownloadInvoiceButton({
  document,
  variant = 'outline',
  size = 'sm',
  className,
}: DownloadInvoiceButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    try {
      setLoading(true)

      const response = await fetch(`/api/invoices/${document.id_document}`)

      if (!response.ok) {
        throw new Error(`Failed to download PDF: ${response.status}`)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url

      const disposition = response.headers.get('Content-Disposition')
      const filenameMatch = disposition?.match(/filename="?(.+?)"?$/)
      link.download = filenameMatch ? filenameMatch[1] : `document_${document.id_document}.pdf`

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
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
        <HugeiconsIcon icon={Loading01Icon} className="size-4 animate-spin" />
      ) : (
        <HugeiconsIcon icon={FileDownloadIcon} className="size-4" />
      )}
      {size !== 'icon' && <span className="ml-2">PDF</span>}
    </Button>
  )
}
