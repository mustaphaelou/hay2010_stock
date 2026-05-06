import { getAffaires } from '@/app/actions/affaires'
import AffairesClient from './AffairesClient'
import type { AffaireWithComputed } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function AffairesPage() {
  const result = await getAffaires()
  const initialAffaires: AffaireWithComputed[] = result.data ?? []

  return <AffairesClient initialAffaires={initialAffaires} />
}
