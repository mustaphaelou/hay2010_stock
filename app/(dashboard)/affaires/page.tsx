import { getAffaires } from '@/app/actions/affaires'
import AffairesClient from './AffairesClient'

export const dynamic = 'force-dynamic'

export default async function AffairesPage() {
  let initialAffaires: string[] = []

  try {
    initialAffaires = await getAffaires()
  } catch {
    initialAffaires = []
  }

  return <AffairesClient initialAffaires={initialAffaires} />
}
