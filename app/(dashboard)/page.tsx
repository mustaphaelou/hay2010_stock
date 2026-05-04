import { getDashboardStats } from "@/app/actions/dashboard"
import { DashboardClient } from "./dashboard-client"

export const dynamic = 'force-dynamic'

export default async function Page() {
  const { stats, recentDocs, salesInvoices, monthlyData } = await getDashboardStats()

  return (
    <DashboardClient
      stats={stats}
      recentDocs={recentDocs}
      salesInvoices={salesInvoices}
      monthlyData={monthlyData}
    />
  )
}
