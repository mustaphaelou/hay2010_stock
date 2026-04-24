import { getDocuments } from '@/app/actions/documents'
import DocumentsClient from './DocumentsClient'

export const dynamic = 'force-dynamic'

export default async function DocumentsPage() {
  let initialData: Awaited<ReturnType<typeof getDocuments>>['data'] = []
  let initialError: string | null = null

  try {
    const result = await getDocuments()
    if (result.error) {
      initialError = result.error
    } else {
      initialData = result.data || []
    }
  } catch (err) {
    initialError = err instanceof Error ? err.message : 'Erreur réseau'
  }

  return <DocumentsClient initialData={initialData} initialError={initialError} />
}
