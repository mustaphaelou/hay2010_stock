'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { HugeiconsIcon } from '@hugeicons/react'
import { RefreshIcon, AlertCircleIcon } from '@hugeicons/core-free-icons'

export default function SuppliersError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Suppliers page error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
      <HugeiconsIcon icon={AlertCircleIcon} className="size-12 text-destructive" />
      <h2 className="text-2xl font-bold">Erreur de chargement</h2>
      <p className="text-muted-foreground text-center max-w-md">
        Une erreur est survenue lors du chargement des fournisseurs.
      </p>
      <Button onClick={reset} variant="outline">
        <HugeiconsIcon icon={RefreshIcon} className="mr-2 size-4" />
        Réessayer
      </Button>
    </div>
  )
}
