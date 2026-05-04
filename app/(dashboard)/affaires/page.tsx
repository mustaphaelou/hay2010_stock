import { getAffaires } from '@/app/actions/affaires'
import AffairesClient from './AffairesClient'
import { loadPageData } from '@/lib/page-data-loader'

export const dynamic = 'force-dynamic'

export default async function AffairesPage() {
  const { data: initialAffaires } = await loadPageData(
    async () => {
      const data = await getAffaires()
      return { data }
    }
  )

  return <AffairesClient initialAffaires={initialAffaires} />
}
