'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { captureClientError } from '@/lib/utils/client-logger'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    captureClientError(error, { tags: { component: 'ArticlesErrorBoundary', route: '/articles' } })
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Erreur Articles</CardTitle>
          <CardDescription>
            Impossible de charger les données des articles.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex gap-2 justify-center">
            <Button onClick={() => reset()} variant="default">
              Réessayer
            </Button>
            <Button onClick={() => window.location.href = '/'} variant="outline">
              Accueil
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
