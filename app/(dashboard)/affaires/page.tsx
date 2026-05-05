import { getAffaires } from '@/app/actions/affaires'
import AffairesClient from './AffairesClient'

export const dynamic = 'force-dynamic'

export default async function AffairesPage() {
  const result = await getAffaires()
  const initialAffaires = result.data ?? []

  return <AffairesClient initialAffaires={initialAffaires} />
}
