"use client"

import * as React from "react"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/erp/app-sidebar"
import { SiteHeader } from "@/components/erp/site-header"
import { PartnersView } from "@/components/erp/partners-view"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HugeiconsIcon } from "@hugeicons/react"
import { UserGroupIcon, TruckDeliveryIcon } from "@hugeicons/core-free-icons"

import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function PartnersContent() {
    const searchParams = useSearchParams()
    const tabParam = searchParams.get("tab")
    const defaultTab = tabParam === "suppliers" ? "suppliers" : "clients"

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0 md:gap-8 md:p-8">
            <Tabs defaultValue={defaultTab} className="w-full">
                <div className="flex items-center justify-between mb-4">
                    <TabsList className="grid w-full max-w-[400px] grid-cols-2">
                        <TabsTrigger value="clients" className="flex items-center gap-2">
                            <HugeiconsIcon icon={UserGroupIcon} size={16} />
                            <span>Clients</span>
                        </TabsTrigger>
                        <TabsTrigger value="suppliers" className="flex items-center gap-2">
                            <HugeiconsIcon icon={TruckDeliveryIcon} size={16} />
                            <span>Fournisseurs</span>
                        </TabsTrigger>
                    </TabsList>
                </div>
                <TabsContent value="clients" className="mt-0 border-none p-0 outline-none">
                    <PartnersView type={0} title="Gestion des Clients" />
                </TabsContent>
                <TabsContent value="suppliers" className="mt-0 border-none p-0 outline-none">
                    <PartnersView type={1} title="Gestion des Fournisseurs" />
                </TabsContent>
            </Tabs>
        </div>
    )
}

export default function PartnersPage() {
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
                <Suspense fallback={<div className="p-8">Chargement...</div>}>
                    <PartnersContent />
                </Suspense>
            </SidebarInset>
        </SidebarProvider>
    )
}
