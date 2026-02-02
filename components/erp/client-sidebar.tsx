"use client"

import dynamic from "next/dynamic"

export const ClientSidebar = dynamic(() => import("@/components/erp/app-sidebar").then(mod => mod.AppSidebar), {
    ssr: false,
    loading: () => <div className="hidden md:block w-[--sidebar-width] bg-sidebar border-r h-svh" />
})
