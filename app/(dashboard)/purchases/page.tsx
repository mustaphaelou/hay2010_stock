import { getPurchasesDocuments } from '@/app/actions/documents'
import PurchasesClient from './PurchasesClient'
import { loadPageData } from '@/lib/page-data-loader'

export const dynamic = 'force-dynamic'

export default async function PurchasesPage() {
  const { data: initialData, error: initialError } = await loadPageData(
    () => getPurchasesDocuments(),
    { errorMessage: 'Erreur réseau' }
  )

  return <PurchasesClient initialData={initialData} initialError={initialError} />
}
