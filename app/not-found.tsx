import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] space-y-4">
      <h2 className="text-2xl font-bold">Page Introuvable</h2>
      <p>La page que vous recherchez n'existe pas ou a été déplacée.</p>
      <Link href="/">
        <Button>Retour à l'accueil</Button>
      </Link>
    </div>
  )
}
