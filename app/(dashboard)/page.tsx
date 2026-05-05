import { getDashboardStats } from "@/app/actions/dashboard"
import { DashboardClient } from "./dashboard-client"

export const dynamic = 'force-dynamic'

export default async function Page() {
  const result = await getDashboardStats()
  const { stats, recentDocs, salesInvoices, monthlyData } = result.data ?? {
    stats: { clients: 0, suppliers: 0, products: 0, families: 0, salesCount: 0, purchasesCount: 0, lowStockCount: 0, totalStockProducts: 0, totalSalesAmount: 0, totalPurchasesAmount: 0 },
    recentDocs: [],
    salesInvoices: [],
    monthlyData: [],
  }

  return (
    <DashboardClient
      stats={stats}
      recentDocs={recentDocs}
      salesInvoices={salesInvoices}
      monthlyData={monthlyData}
    />
  )
}
