"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import type { DocumentWithComputed, DashboardStats, SalesInvoice, MonthlyDataPoint } from "@/lib/types"
import { DashboardProvider, useDashboardRefresh } from "@/components/dashboard/enhanced/dashboard-context"
import { ThemeCustomizer } from "@/components/dashboard/enhanced"
import { CommandCenter } from "@/components/dashboard/command-center"
import { toast } from "sonner"

interface DashboardClientProps {
  stats: DashboardStats
  recentDocs: DocumentWithComputed[]
  salesInvoices: SalesInvoice[]
  monthlyData: MonthlyDataPoint[]
}

function DashboardClientInner(props: DashboardClientProps) {
  const { stats, recentDocs, salesInvoices, monthlyData } = props
  const router = useRouter()
  const [lastUpdated, setLastUpdated] = React.useState<string>(
    new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  )
  const { refresh: contextRefresh } = useDashboardRefresh()

  const updateTimestamp = React.useCallback(() => {
    setLastUpdated(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }))
  }, [])

  const handleRefresh = React.useCallback(async () => {
    try {
      router.refresh()
      await contextRefresh()
      updateTimestamp()
      toast.success("Données mises à jour")
    } catch {
      toast.error("Erreur lors de l'actualisation")
    }
  }, [router, contextRefresh, updateTimestamp])

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
        handleExport()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleRefresh, handleExport])

  return (
    <div id="main-content" className="flex flex-1 flex-col gap-4 p-4 pt-0 pb-20 md:gap-8 md:p-8 md:pb-8">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Dernière mise à jour : {lastUpdated}</p>
      </div>
      <CommandCenter
        stats={stats}
        recentDocs={recentDocs}
        salesInvoices={salesInvoices}
        monthlyData={monthlyData}
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
    }}>
      <DashboardClientInner {...props} />
    </DashboardProvider>
  )
}
