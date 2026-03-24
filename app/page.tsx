import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { SiteHeader } from "@/components/erp/site-header"
import { DashboardView } from "@/components/erp/dashboard-view"
import { BottomNav } from "@/components/erp/bottom-nav"
import { getDashboardStats } from "@/app/actions/dashboard"
import { Suspense } from "react"
import { ClientSidebar as AppSidebar } from "@/components/erp/client-sidebar"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/app/actions/auth"

export default async function Page() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }
  
  const { stats, recentDocs, salesInvoices } = await getDashboardStats()

    // Calculate payment status data
    let regle = 0, partiel = 0, encours = 0
    salesInvoices.forEach((inv) => {
        const montant_regle = Number(inv.montant_regle || 0)
        const montant_ttc = Number(inv.montant_ttc || 0)

        const isPaid = montant_regle > 0 && montant_regle >= montant_ttc
        const isPartial = montant_regle > 0 && montant_regle < montant_ttc
        if (isPaid) regle++
        else if (isPartial) partiel++
        else encours++
    })

    const paymentData = [
        { name: "Réglé", value: regle, fill: "hsl(142, 76%, 36%)" },
        { name: "Partiel", value: partiel, fill: "hsl(38, 92%, 50%)" },
        { name: "En cours", value: encours, fill: "hsl(215, 20%, 65%)" },
    ]

    // Group by month for monthly chart (last 6 months)
    const monthlyMap = new Map<string, { ventes: number; achats: number }>()
    const now = new Date()

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
        monthlyMap.set(key, { ventes: 0, achats: 0 })
    }

    // We'd need more data for accurate monthly totals - using a simplified approach
    // In production, you'd want a SQL aggregate query
    const monthlyData = Array.from(monthlyMap.entries()).map(([month, data]) => ({
        month,
        ventes: data.ventes,
        achats: data.achats
    }))

    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "280px",
                    "--header-height": "3.5rem",
                } as React.CSSProperties
            }
        >
            <Suspense fallback={<div className="hidden md:block w-[--sidebar-width] bg-sidebar border-r h-svh" />}>
                <AppSidebar />
            </Suspense>
            <SidebarInset>
                <SiteHeader />
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0 pb-20 md:gap-8 md:p-8 md:pb-8">
                    <DashboardView
                        initialStats={stats}
                        initialRecentDocs={recentDocs as DocumentWithComputed[]}
                        paymentData={paymentData}
                        monthlyData={monthlyData}
                    />
                </div>
                <BottomNav />
            </SidebarInset>
        </SidebarProvider>
    )
}
