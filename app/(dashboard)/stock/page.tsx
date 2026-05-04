import { getStockLevels, getDepots } from '@/app/actions/stock'
import StockClient from './StockClient'
import { loadPageData } from '@/lib/page-data-loader'

export const dynamic = 'force-dynamic'

export default async function StockPage() {
  let initialDepots: Awaited<ReturnType<typeof getDepots>> = []

  const { data: initialStockData, error: initialError } = await loadPageData(
    async () => {
      const [stockResult, depotsData] = await Promise.all([
        getStockLevels(),
        getDepots()
      ])
      initialDepots = depotsData || []
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
