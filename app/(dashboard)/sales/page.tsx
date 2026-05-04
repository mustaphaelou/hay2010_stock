import { getSalesDocuments } from '@/app/actions/documents'
import SalesClient from './SalesClient'
import { loadPageData } from '@/lib/page-data-loader'

export const dynamic = 'force-dynamic'

export default async function SalesPage() {
  const { data: initialData, error: initialError } = await loadPageData(
    () => getSalesDocuments(),
    { errorMessage: 'Erreur réseau' }
  )

  return <SalesClient initialData={initialData} initialError={initialError} />
}
