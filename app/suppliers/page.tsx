import * as React from "react"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/erp/app-sidebar"
import { SiteHeader } from "@/components/erp/site-header"
import { PartnersView } from "@/components/erp/partners-view"
import { createClient } from "@/lib/supabase/server"

export default async function SuppliersPage() {
    const supabase = await createClient()

    const { data: partners } = await supabase
        .from("f_comptet")
        .select("*")
        .eq("ct_type", 1)
        .order("ct_intitule")

    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "280px",
                    "--header-height": "3.5rem",
                } as React.CSSProperties
            }
        >
            <AppSidebar />
            <SidebarInset>
                <SiteHeader />
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0 md:gap-8 md:p-8">
                    <PartnersView type={1} title="Fournisseurs" initialData={partners || []} />
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
