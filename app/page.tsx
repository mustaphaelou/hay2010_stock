import { getDashboardStats } from "@/app/actions/dashboard"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth/user-utils"
import { DashboardClient } from "./dashboard-client"

export default async function Page() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }

  const { stats, recentDocs, salesInvoices } = await getDashboardStats()

  return (
    <DashboardClient 
      stats={stats} 
      recentDocs={recentDocs} 
      salesInvoices={salesInvoices} 
    />
  )
}
