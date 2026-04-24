import { getPurchasesDocuments } from '@/app/actions/documents'
import PurchasesClient from './PurchasesClient'

export const dynamic = 'force-dynamic'

export default async function PurchasesPage() {
  let initialData: Awaited<ReturnType<typeof getPurchasesDocuments>>['data'] = []
  let initialError: string | null = null

  try {
    const result = await getPurchasesDocuments()
    if (result.error) {
      initialError = result.error
    } else {
      initialData = result.data || []
    }
  } catch (err) {
    initialError = err instanceof Error ? err.message : 'Erreur réseau'
  }

  return <PurchasesClient initialData={initialData} initialError={initialError} />
}
