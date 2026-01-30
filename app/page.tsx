import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/erp/app-sidebar"
import { SiteHeader } from "@/components/erp/site-header"
import { DashboardView } from "@/components/erp/dashboard-view"
import { BottomNav } from "@/components/erp/bottom-nav"
import { createClient } from "@/lib/supabase/server"
import { FDocentete } from "@/lib/supabase/types"
import { Suspense } from "react"

export default async function Page() {
    const supabase = await createClient()

    const [
        clientsRes,
        suppliersRes,
        productsRes,
        salesRes,
        purchasesRes,
        recentRes
    ] = await Promise.all([
        supabase.from("f_comptet").select("*", { count: "exact", head: true }).eq("ct_type", 0), // Clients
        supabase.from("f_comptet").select("*", { count: "exact", head: true }).eq("ct_type", 1), // Suppliers
        supabase.from("f_article").select("*", { count: "exact", head: true }),
        supabase.from("f_docentete").select("*", { count: "exact", head: true }).eq("do_domaine", 0), // Sales
        supabase.from("f_docentete").select("*", { count: "exact", head: true }).eq("do_domaine", 1), // Purchases
        supabase.from("f_docentete")
            .select("*, f_comptet(ct_intitule)")
            .order("do_date_create", { ascending: false })
            .limit(5)
    ])

    const stats = {
        clients: clientsRes.count || 0,
        suppliers: suppliersRes.count || 0,
        products: productsRes.count || 0,
        salesCount: salesRes.count || 0,
        purchasesCount: purchasesRes.count || 0
    }

    const recentDocs = (recentRes.data || []) as unknown as FDocentete[]

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
                    <DashboardView initialStats={stats} initialRecentDocs={recentDocs} />
                </div>
                <BottomNav />
            </SidebarInset>
        </SidebarProvider>
    )
}