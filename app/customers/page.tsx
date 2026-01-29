"use client"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/erp/app-sidebar"
import { SiteHeader } from "@/components/erp/site-header"
import { PartnersView } from "@/components/erp/partners-view"

import { Suspense } from "react"

export default function CustomersPage() {
    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "280px",
                    "--header-height": "3.5rem",
                } as React.CSSProperties
            }
        >
            <Suspense>
                <AppSidebar />
            </Suspense>
            <SidebarInset>
                <SiteHeader />
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0 md:gap-8 md:p-8">
                    <PartnersView type={0} title="Clients" />
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
