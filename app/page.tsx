import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { SiteHeader } from "@/components/erp/site-header"
import { DashboardView } from "@/components/erp/dashboard-view"
import { BottomNav } from "@/components/erp/bottom-nav"
import { createClient } from "@/lib/supabase/server"
import { FDocentete } from "@/lib/supabase/types"
import { Suspense } from "react"
import { ClientSidebar as AppSidebar } from "@/components/erp/client-sidebar"

export default async function Page() {
    const supabase = await createClient()

    const [
        clientsRes,
        suppliersRes,
        productsRes,
        familiesRes,
        salesRes,
        purchasesRes,
        recentRes,
        salesInvoicesRes,
    ] = await Promise.all([
        supabase.from("f_comptet").select("*", { count: "exact", head: true }).eq("ct_type", 0), // Clients
        supabase.from("f_comptet").select("*", { count: "exact", head: true }).eq("ct_type", 1), // Suppliers
        supabase.from("f_article").select("*", { count: "exact", head: true }),
        supabase.from("f_famille").select("*", { count: "exact", head: true }),
        supabase.from("f_docentete").select("*", { count: "exact", head: true }).eq("do_domaine", 0), // Sales
        supabase.from("f_docentete").select("*", { count: "exact", head: true }).eq("do_domaine", 1), // Purchases
        supabase.from("f_docentete")
            .select("*, f_comptet(ct_intitule)")
            .order("do_date_create", { ascending: false })
            .limit(5),
        // Get sales invoices for payment status chart
        supabase.from("f_docentete")
            .select("do_totalttc, do_montregl, do_date")
            .eq("do_domaine", 0)
            .in("do_type", [6, 7]) // Factures et Factures comptabilisées
            .limit(500)
    ])

    const stats = {
        clients: clientsRes.count || 0,
        suppliers: suppliersRes.count || 0,
        products: productsRes.count || 0,
        families: familiesRes.count || 0,
        salesCount: salesRes.count || 0,
        purchasesCount: purchasesRes.count || 0
    }

    const recentDocs = (recentRes.data || []) as unknown as FDocentete[]
    const salesInvoices = salesInvoicesRes.data || []

    // Calculate payment status data
    let regle = 0, partiel = 0, encours = 0
    salesInvoices.forEach((inv: any) => {
        const isPaid = inv.do_montregl && inv.do_totalttc && inv.do_montregl >= inv.do_totalttc
        const isPartial = inv.do_montregl && inv.do_totalttc && inv.do_montregl > 0 && inv.do_montregl < inv.do_totalttc
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
                        initialRecentDocs={recentDocs}
                        paymentData={paymentData}
                        monthlyData={monthlyData}
                    />
                </div>
                <BottomNav />
            </SidebarInset>
        </SidebarProvider>
    )
}
