"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import type { DocumentWithComputed, DashboardStats, SalesInvoice, MonthlyDataPoint, DashboardActivityItem, DashboardTopProduct, DashboardLowStockItem, DashboardMovementData } from "@/lib/types"
import { DashboardProvider, useDashboardRefresh } from "@/components/dashboard/enhanced/dashboard-context"
import { EnhancedDashboardView } from "@/components/dashboard/enhanced/enhanced-dashboard-view"
import { toast } from "sonner"

interface DashboardClientProps {
  stats: DashboardStats
  recentDocs: DocumentWithComputed[]
  salesInvoices: SalesInvoice[]
  monthlyData: MonthlyDataPoint[]
  activities: DashboardActivityItem[]
  topProducts: DashboardTopProduct[]
  lowStockItems: DashboardLowStockItem[]
  todaysMovements: DashboardMovementData[]
}

function DashboardClientInner(props: DashboardClientProps) {
  const { stats, recentDocs, salesInvoices, monthlyData, activities, topProducts, lowStockItems, todaysMovements } = props
  const router = useRouter()
  const { refresh: contextRefresh } = useDashboardRefresh()

  const handleRefresh = React.useCallback(async () => {
    try {
      router.refresh()
      await contextRefresh()
      toast.success("Données mises à jour")
    } catch {
      toast.error("Erreur lors de l'actualisation")
    }
  }, [router, contextRefresh])

  const handleExport = React.useCallback(() => {
    const headers = ["Mois", "Ventes (MAD)", "Achats (MAD)"]
    const rows = monthlyData.map(d => [d.month, d.ventes.toString(), d.achats.toString()])
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `tableau-de-bord-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Export réussi")
  }, [monthlyData])

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0
      const cmdKey = isMac ? event.metaKey : event.ctrlKey
      if (cmdKey && event.key.toLowerCase() === "r") {
        event.preventDefault()
        handleRefresh()
      }
      if (cmdKey && event.key.toLowerCase() === "e") {
        event.preventDefault()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleRefresh, handleExport])

  const rupturesPct = stats.totalStockProducts > 0
    ? Math.round((stats.lowStockCount / stats.totalStockProducts) * 100)
    : 0

  const kpiCards = [
    {
      id: "revenue",
      title: "Chiffre d'Affaires",
      value: stats.totalSalesAmount,
      suffix: " MAD",
      description: "Ventes cumulées sur la période",
      tone: "success" as const,
    },
    {
      id: "stock",
      title: "Stock disponible",
      value: `${stats.stockAvailability}%`,
      description: `${stats.totalStockProducts - stats.lowStockCount} / ${stats.totalStockProducts} produits`,
      tone: "default" as const,
      progress: stats.stockAvailability,
    },
    {
      id: "low-stock",
      title: "Ruptures & stock bas",
      value: stats.lowStockCount,
      description: `dont ${stats.lowStockCount} en rupture`,
      tone: "danger" as const,
      progress: rupturesPct,
    },
    {
      id: "margin",
      title: "Marge brute",
      value: Math.max(0, stats.totalSalesAmount - stats.totalPurchasesAmount),
      suffix: " MAD",
      description: "Ventes moins achats sur la période",
      tone: "info" as const,
    },
  ]

  const chartData = monthlyData.map((m) => ({
    date: m.month,
    Ventes: m.ventes,
    Achats: m.achats,
    Marge: Math.max(0, m.ventes - m.achats),
  }))

  const charts = [
    {
      id: "sales-purchases",
      title: "Évolution de la Rentabilité",
      description: "Comparaison des ventes, achats et marge commerciale nette.",
      data: chartData,
      series: [
        { key: "Ventes", label: "Ventes" },
        { key: "Achats", label: "Achats" },
        { key: "Marge", label: "Marge Brute" },
      ],
    },
  ]

  const tableColumns = [
    { key: "month", label: "Mois" },
    { key: "ventes", label: "Ventes (MAD)", align: "right" as const, format: "currency" as const },
    { key: "achats", label: "Achats (MAD)", align: "right" as const, format: "currency" as const },
    { key: "marge", label: "Marge Brute (MAD)", align: "right" as const, format: "currency" as const },
    { key: "margePct", label: "Taux de Marge (%)", align: "right" as const, format: "percentage" as const },
  ]

  const tableRows = monthlyData.map((d) => {
    const margin = Math.max(0, d.ventes - d.achats)
    const marginPctVal = d.ventes > 0 ? Math.round((margin / d.ventes) * 100) : 0
    return { month: d.month, ventes: d.ventes, achats: d.achats, marge: margin, margePct: marginPctVal }
  })

  return (
    <div id="main-content" className="flex flex-1 flex-col gap-4 p-4 pt-0 pb-20 md:gap-8 md:p-8 md:pb-8">
      <EnhancedDashboardView
        title="Analyse Commerciale & Financière"
        description="Perspectives stratégiques, rentabilité et performance des flux de trésorerie."
        kpiCards={kpiCards}
        charts={charts}
        table={{ columns: tableColumns, rows: tableRows }}
        activities={activities}
        topProducts={topProducts}
        lowStockItems={lowStockItems}
        todaysMovements={todaysMovements}
        onRefresh={handleRefresh}
        onExport={handleExport}
      />
    </div>
  )
}

export function DashboardClient(props: DashboardClientProps) {
  return (
    <DashboardProvider autoRefresh refreshInterval={60000} initialData={{
      stats: props.stats,
      recentDocs: [],
      salesInvoices: props.salesInvoices,
      monthlyData: props.monthlyData,
      activities: props.activities,
      topProducts: props.topProducts,
      lowStockItems: props.lowStockItems,
      todaysMovements: props.todaysMovements,
    }}>
      <DashboardClientInner {...props} />
    </DashboardProvider>
  )
}
