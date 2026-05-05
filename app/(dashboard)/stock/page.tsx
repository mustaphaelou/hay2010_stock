import { getStockLevels, getDepots } from '@/app/actions/stock'
import StockClient from './StockClient'
import { loadPageData } from '@/lib/page-data-loader'
import type { Depot } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function StockPage() {
  let initialDepots: Depot[] = []

  const { data: initialStockData, error: initialError } = await loadPageData(
    async () => {
      const [stockResult, depotsResult] = await Promise.all([
        getStockLevels(),
        getDepots()
      ])
      initialDepots = depotsResult.data ?? []
      return stockResult
    },
    { errorMessage: 'Erreur lors du chargement des niveaux de stock' }
  )

  return (
    <StockClient
      initialStockData={initialStockData}
      initialDepots={initialDepots}
      initialError={initialError}
    />
  )
}
