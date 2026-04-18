import { getStockLevels, getDepots } from '@/app/actions/stock'
import StockClient from './StockClient'

export default async function StockPage() {
  let initialStockData: Awaited<ReturnType<typeof getStockLevels>>['data'] = []
  let initialDepots: Awaited<ReturnType<typeof getDepots>> = []
  let initialError: string | null = null

  try {
    const [stockResult, depotsData] = await Promise.all([
      getStockLevels(),
      getDepots()
    ])

    if (stockResult.error) {
      initialError = stockResult.error
    } else {
      initialStockData = stockResult.data || []
    }
    initialDepots = depotsData || []
  } catch (err) {
    initialError = err instanceof Error ? err.message : 'Erreur lors du chargement des niveaux de stock'
  }

  return (
    <StockClient
      initialStockData={initialStockData}
      initialDepots={initialDepots}
      initialError={initialError}
    />
  )
}
