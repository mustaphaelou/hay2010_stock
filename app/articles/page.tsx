import { Metadata } from 'next'
import * as React from "react"
import { Suspense } from "react"
import { redirect } from "next/navigation"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/erp/app-sidebar"
import { SiteHeader } from "@/components/erp/site-header"
import { BottomNav } from "@/components/erp/bottom-nav"
import { ArticlesView } from "@/components/erp/articles-view"

import { getArticlesWithStock } from "@/app/actions/articles"
import { getCurrentUser } from "@/app/actions/auth"

export const metadata: Metadata = {
  title: 'Articles | HAY2010',
  description: 'Gestion des articles et produits'
}

export const dynamic = 'force-dynamic'

export default async function ArticlesPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }
  
  const articlesResult = await getArticlesWithStock()
  const articlesWithStock = articlesResult.data || []
  
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
                    <ArticlesView data={articlesWithStock} />
                </div>
                <BottomNav />
            </SidebarInset>
        </SidebarProvider>
    )
}
