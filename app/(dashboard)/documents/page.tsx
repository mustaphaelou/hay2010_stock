import { getDocuments } from '@/app/actions/documents'
import DocumentsClient from './DocumentsClient'
import { loadPageData } from '@/lib/page-data-loader'

export const dynamic = 'force-dynamic'

export default async function DocumentsPage() {
  const { data: initialData, error: initialError } = await loadPageData(
    () => getDocuments(),
    { errorMessage: 'Erreur réseau' }
  )

  return <DocumentsClient initialData={initialData} initialError={initialError} />
}
