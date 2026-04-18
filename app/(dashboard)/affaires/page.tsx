import { getAffaires } from '@/app/actions/affaires'
import AffairesClient from './AffairesClient'

export default async function AffairesPage() {
  let initialAffaires: string[] = []

  try {
    initialAffaires = await getAffaires()
  } catch {
    initialAffaires = []
  }

  return <AffairesClient initialAffaires={initialAffaires} />
}
