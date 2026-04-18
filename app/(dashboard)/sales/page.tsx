import { getSalesDocuments } from '@/app/actions/documents'
import SalesClient from './SalesClient'

export default async function SalesPage() {
  let initialData: Awaited<ReturnType<typeof getSalesDocuments>>['data'] = []
  let initialError: string | null = null

  try {
    const result = await getSalesDocuments()
    if (result.error) {
      initialError = result.error
    } else {
      initialData = result.data || []
    }
  } catch (err) {
    initialError = err instanceof Error ? err.message : 'Erreur réseau'
  }

  return <SalesClient initialData={initialData} initialError={initialError} />
}
