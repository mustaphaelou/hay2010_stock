"use client"

import * as React from "react"
import { Suspense } from "react"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { SiteHeader } from "@/components/erp/site-header"
import { DashboardView } from "@/components/erp/dashboard-view"
import { BottomNav } from "@/components/erp/bottom-nav"
import { getDashboardStats } from "@/app/actions/dashboard"
import { ClientSidebar as AppSidebar } from "@/components/erp/client-sidebar"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/app/actions/auth"
import type { DocumentWithComputed } from "@/lib/types"
import { EnhancedDashboardView } from "@/components/dashboard/enhanced"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  LayoutGridIcon,
  LayoutIcon,
  SparklesIcon,
  Invoice01Icon,
} from "@hugeicons/core-free-icons"

export default function Page() {
  return <DashboardWrapper />
}

function DashboardWrapper() {
  const [viewMode, setViewMode] = React.useState<"classic" | "enhanced">("classic")

  return (
    <DashboardContent viewMode={viewMode} onViewModeChange={setViewMode} />
  )
}

interface DashboardContentProps {
  viewMode: "classic" | "enhanced"
  onViewModeChange: (mode: "classic" | "enhanced") => void
}

async function DashboardContent({ viewMode, onViewModeChange }: DashboardContentProps) {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }

  const { stats, recentDocs, salesInvoices } = await getDashboardStats()

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

  const monthlyMap = new Map<string, { ventes: number; achats: number }>()
  const now = new Date()

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
    monthlyMap.set(key, { ventes: 0, achats: 0 })
  }

  const monthlyData = Array.from(monthlyMap.entries()).map(([month, data]) => ({
    month,
    ventes: data.ventes,
    achats: data.achats
  }))

  const kpiCards = [
    {
      id: "clients",
      title: "Clients",
      value: stats.clients,
      description: "Comptes actifs",
      icon: Invoice01Icon,
      iconColor: "text-primary",
      variant: "success" as const,
      trend: { value: 12, direction: "up" as const, label: "+12% ce mois" },
    },
    {
      id: "suppliers",
      title: "Fournisseurs",
      value: stats.suppliers,
      description: "Fournisseurs actifs",
      icon: Invoice01Icon,
      iconColor: "text-blue-500",
      variant: "info" as const,
    },
    {
      id: "products",
      title: "Articles",
      value: stats.products,
      description: "Références",
      icon: Invoice01Icon,
      iconColor: "text-violet-500",
      variant: "default" as const,
    },
    {
      id: "families",
      title: "Familles",
      value: stats.families || 0,
      description: "Catégories",
      icon: Invoice01Icon,
      iconColor: "text-orange-500",
      variant: "warning" as const,
    },
    {
      id: "sales",
      title: "Ventes",
      value: stats.salesCount,
      description: "Documents",
      icon: Invoice01Icon,
      iconColor: "text-emerald-500",
      variant: "success" as const,
      trend: { value: 8, direction: "up" as const },
    },
    {
      id: "purchases",
      title: "Achats",
      value: stats.purchasesCount,
      description: "Documents",
      icon: Invoice01Icon,
      iconColor: "text-fuchsia-500",
      variant: "info" as const,
    },
  ]

  const activities = (recentDocs as DocumentWithComputed[]).slice(0, 5).map((doc) => ({
    id: String(doc.id_document),
    title: doc.numero_piece || doc.numero_document || `Document #${doc.id_document}`,
    description: doc.partenaire?.nom_partenaire || "N/A",
    timestamp: doc.date_document,
    status: doc.montant_regle >= Number(doc.montant_ttc) ? "success" as const : "warning" as const,
    icon: Invoice01Icon,
    href: `/documents/${doc.id_document}`,
  }))

  const paymentPercentage = stats.salesCount > 0 
    ? Math.round((regle / stats.salesCount) * 100)
    : 0

  const stockPercentage = 75

  const gauges = [
    {
      id: "payment",
      title: "Paiements",
      description: "Statut des paiements",
      value: paymentPercentage,
      thresholds: [
        { value: 25, label: "Critique", color: "#ef4444" },
        { value: 50, label: "En cours", color: "#f97316" },
        { value: 75, label: "Bon", color: "#eab308" },
        { value: 100, label: "Excellent", color: "#22c55e" },
      ],
    },
    {
      id: "stock",
      title: "Stock",
      description: "Niveau de stock",
      value: stockPercentage,
      thresholds: [
        { value: 20, label: "Critique", color: "#ef4444" },
        { value: 40, label: "Faible", color: "#f97316" },
        { value: 70, label: "Bon", color: "#eab308" },
        { value: 100, label: "Optimal", color: "#22c55e" },
      ],
    },
  ]

  const chartData = monthlyData.map((item) => ({
    date: item.month,
    ventes: item.ventes,
    achats: item.achats,
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
          <div className="flex items-center justify-end gap-2">
            <div className="flex gap-1 border rounded-lg p-1 bg-muted/30">
              <Button
                variant={viewMode === "classic" ? "default" : "ghost"}
                size="xs"
                onClick={() => onViewModeChange("classic")}
                className="gap-1.5"
                aria-label="Classic view"
              >
                <HugeiconsIcon icon={LayoutIcon} strokeWidth={2} className="size-4" />
                <span className="hidden sm:inline">Classic</span>
              </Button>
              <Button
                variant={viewMode === "enhanced" ? "default" : "ghost"}
                size="xs"
                onClick={() => onViewModeChange("enhanced")}
                className="gap-1.5"
                aria-label="Enhanced view"
              >
                <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="size-4" />
                <span className="hidden sm:inline">Enhanced</span>
              </Button>
            </div>
          </div>

          {viewMode === "enhanced" ? (
            <EnhancedDashboardView
              title="Tableau de bord"
              description="Vue d'ensemble de vos activités commerciales"
              kpiCards={kpiCards}
              charts={[
                {
                  id: "sales-vs-purchases",
                  title: "Ventes vs Achats",
                  description: "Comparaison mensuelle des ventes et achats",
                  data: chartData,
                  series: [
                    { key: "ventes", label: "Ventes", color: "hsl(142, 76%, 36%)" },
                    { key: "achats", label: "Achats", color: "hsl(262, 83%, 58%)" },
                  ],
                  chartType: "area",
                  defaultTimeRange: "all",
                },
              ]}
              activities={activities}
              gauges={gauges}
              showViewToggle
            />
          ) : (
            <DashboardView
              initialStats={stats}
              initialRecentDocs={recentDocs as never}
              paymentData={paymentData}
              monthlyData={monthlyData}
            />
          )}
        </div>
        <BottomNav />
      </SidebarInset>
    </SidebarProvider>
  )
}
