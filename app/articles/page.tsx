import * as React from "react"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/erp/app-sidebar"
import { SiteHeader } from "@/components/erp/site-header"
import { ArticlesView, ArticleWithStock } from "@/components/erp/articles-view"
import { createClient } from "@/lib/supabase/server"

export default async function ArticlesPage() {
    const supabase = await createClient()

    // Server-side parallel data fetching (eliminates client waterfall)
    const [articlesResult, stockResult] = await Promise.all([
        supabase
            .from("f_article")
            .select("*, f_famille(fa_intitule)")
            .order("ar_design"),
        supabase
            .from("f_artstock")
            .select("ar_ref, as_qtesto")
    ])

    // Aggregate stock per article in single pass
    const stockByArticle: Record<string, number> = {}
    stockResult.data?.forEach((s) => {
        if (s.ar_ref) {
            stockByArticle[s.ar_ref] = (stockByArticle[s.ar_ref] || 0) + (s.as_qtesto || 0)
        }
    })

    // Merge articles with stock data
    const articlesWithStock: ArticleWithStock[] = (articlesResult.data || []).map((article: any) => ({
        ...article,
        stock_global: stockByArticle[article.ar_ref] || 0
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
            <AppSidebar />
            <SidebarInset>
                <SiteHeader />
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0 md:gap-8 md:p-8">
                    <ArticlesView initialData={articlesWithStock} />
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
