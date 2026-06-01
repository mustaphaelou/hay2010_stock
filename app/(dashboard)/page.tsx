import { getDashboardStats } from "@/app/actions/dashboard"
import { DashboardClient } from "./dashboard-client"

export const dynamic = 'force-dynamic'

export default async function Page() {
  const result = await getDashboardStats()
  const data = result.data ?? {
    stats: { clients: 0, suppliers: 0, products: 0, families: 0, salesCount: 0, purchasesCount: 0, lowStockCount: 0, rupturesCount: 0, totalStockProducts: 0, totalSalesAmount: 0, totalPurchasesAmount: 0, paymentRate: 0, stockAvailability: 100, unpaidCount: 0, unpaidTotal: 0 },
    recentDocs: [],
    salesInvoices: [],
    monthlyData: [],
    activities: [],
    topProducts: [],
    lowStockItems: [],
    todaysMovements: [],
  }

  return (
    <DashboardClient
      stats={data.stats}
      recentDocs={data.recentDocs}
      salesInvoices={data.salesInvoices}
      monthlyData={data.monthlyData}
      activities={data.activities}
      topProducts={data.topProducts}
      lowStockItems={data.lowStockItems}
      todaysMovements={data.todaysMovements}
    />
  )
}
