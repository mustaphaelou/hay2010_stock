"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import type { DocumentWithComputed, DashboardStats, SalesInvoice, MonthlyDataPoint } from "@/lib/types"
import { EnhancedDashboardView, ThemeCustomizer } from "@/components/dashboard/enhanced"
import { DashboardView } from "@/components/erp/dashboard-view"
import { DashboardAlerts } from "@/components/dashboard/widgets/dashboard-alerts"
import { DashboardProvider, useDashboardRefresh } from "@/components/dashboard/enhanced/dashboard-context"
import { Button } from "@/components/ui/button"
import { SafeIcon as HugeiconsIcon } from "@/components/ui/safe-icon"
import { toast } from "sonner"
import {
  LayoutIcon,
  SparklesIcon,
  UserGroupIcon,
  TruckIcon,
  Package01Icon,
  GridIcon,
  SaleTag01Icon,
  ShoppingCart01Icon,
  Money01Icon,
  Invoice01Icon,
} from "@hugeicons/core-free-icons"

type PeriodFilter = "1m" | "3m" | "6m" | "1y" | "all"

const periodLabels: Record<PeriodFilter, string> = {
  "1m": "Ce mois",
  "3m": "3 mois",
  "6m": "6 mois",
  "1y": "Cette année",
  "all": "Tout",
}

interface DashboardClientProps {
  stats: DashboardStats
  recentDocs: DocumentWithComputed[]
  salesInvoices: SalesInvoice[]
  monthlyData: MonthlyDataPoint[]
}

function DashboardClientInner({ stats, recentDocs, salesInvoices, monthlyData }: DashboardClientProps) {
  const router = useRouter()
  const [viewMode, setViewMode] = React.useState<"classic" | "enhanced">("classic")
  const [showThemeCustomizer, setShowThemeCustomizer] = React.useState(false)
  const [periodFilter, setPeriodFilter] = React.useState<PeriodFilter>("6m")
  const [lastUpdated, setLastUpdated] = React.useState<string>(
    new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  )
  const { refresh: contextRefresh } = useDashboardRefresh()

  const unpaidInvoices = React.useMemo(() => {
    let count = 0
    let total = 0
    salesInvoices.forEach((inv) => {
      const ttc = Number(inv.montant_ttc)
      const regle = Number(inv.montant_regle)
      if (regle < ttc) {
        count++
        total += ttc - regle
      }
    })
    return count > 0 ? { count, total } : null
  }, [salesInvoices])

  const {
    kpiCards,
    activities,
    gauges,
    chartData,
    paymentData,
  } = React.useMemo(() => {
    let regle = 0, partiel = 0, encours = 0
    salesInvoices.forEach((inv) => {
      const montant_regle = inv.montant_regle
      const montant_ttc = Number(inv.montant_ttc)

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

    const formatMAD = (amount: number) =>
      amount.toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " MAD"

    const currentMonth = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1] : null
    const previousMonth = monthlyData.length > 1 ? monthlyData[monthlyData.length - 2] : null

    const trendData = {
      clients: previousMonth ? { current: stats.clients, previous: stats.clients } : null,
      suppliers: previousMonth ? { current: stats.suppliers, previous: stats.suppliers } : null,
      products: previousMonth ? { current: stats.products, previous: stats.products } : null,
      families: previousMonth ? { current: stats.families, previous: stats.families } : null,
      sales: currentMonth && previousMonth ? { current: currentMonth.ventes, previous: previousMonth.ventes } : null,
      purchases: currentMonth && previousMonth ? { current: currentMonth.achats, previous: previousMonth.achats } : null,
      totalSales: currentMonth && previousMonth ? { current: currentMonth.ventes, previous: previousMonth.ventes } : null,
      totalPurchases: currentMonth && previousMonth ? { current: currentMonth.achats, previous: previousMonth.achats } : null,
    }

    const kpiCards = [
      {
        id: "clients",
        title: "Clients",
        value: stats.clients || 0,
        description: "Comptes actifs",
        icon: UserGroupIcon,
        iconColor: "text-primary",
        variant: "success" as const,
        href: "/customers",
      },
      {
        id: "suppliers",
        title: "Fournisseurs",
        value: stats.suppliers || 0,
        description: "Fournisseurs actifs",
        icon: TruckIcon,
        iconColor: "text-blue-500",
        variant: "info" as const,
        href: "/suppliers",
      },
      {
        id: "products",
        title: "Articles",
        value: stats.products || 0,
        description: "Références",
        icon: Package01Icon,
        iconColor: "text-violet-500",
        variant: "default" as const,
        href: "/articles",
      },
      {
        id: "families",
        title: "Familles",
        value: stats.families || 0,
        description: "Catégories",
        icon: GridIcon,
        iconColor: "text-orange-500",
        variant: "warning" as const,
        href: "/articles",
      },
      {
        id: "sales",
        title: "Ventes",
        value: stats.salesCount || 0,
        description: "Documents",
        icon: SaleTag01Icon,
        iconColor: "text-emerald-500",
        variant: "success" as const,
        href: "/sales",
        trend: trendData.sales ? {
          value: Math.abs(((trendData.sales.current - trendData.sales.previous) / (trendData.sales.previous || 1)) * 100),
          direction: trendData.sales.current >= trendData.sales.previous ? "up" as const : "down" as const,
        } : undefined,
      },
      {
        id: "purchases",
        title: "Achats",
        value: stats.purchasesCount || 0,
        description: "Documents",
        icon: ShoppingCart01Icon,
        iconColor: "text-fuchsia-500",
        variant: "info" as const,
        href: "/purchases",
        trend: trendData.purchases ? {
          value: Math.abs(((trendData.purchases.current - trendData.purchases.previous) / (trendData.purchases.previous || 1)) * 100),
          direction: trendData.purchases.current >= trendData.purchases.previous ? "up" as const : "down" as const,
        } : undefined,
      },
      {
        id: "ca-ventes",
        title: "CA Ventes",
        value: formatMAD(stats.totalSalesAmount || 0),
        description: "Total factures TTC",
        icon: Money01Icon,
        iconColor: "text-emerald-600",
        variant: "success" as const,
        href: "/sales",
        trend: trendData.totalSales ? {
          value: Math.abs(((trendData.totalSales.current - trendData.totalSales.previous) / (trendData.totalSales.previous || 1)) * 100),
          direction: trendData.totalSales.current >= trendData.totalSales.previous ? "up" as const : "down" as const,
        } : undefined,
      },
      {
        id: "total-achats",
        title: "Total Achats",
        value: formatMAD(stats.totalPurchasesAmount || 0),
        description: "Total achats TTC",
        icon: Money01Icon,
        iconColor: "text-fuchsia-600",
        variant: "info" as const,
        href: "/purchases",
        trend: trendData.totalPurchases ? {
          value: Math.abs(((trendData.totalPurchases.current - trendData.totalPurchases.previous) / (trendData.totalPurchases.previous || 1)) * 100),
          direction: trendData.totalPurchases.current >= trendData.totalPurchases.previous ? "up" as const : "down" as const,
        } : undefined,
      },
    ]

    const activities = recentDocs.slice(0, 5).map((doc) => ({
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

    const stockPercentage = stats.totalStockProducts > 0
      ? Math.round(((stats.totalStockProducts - stats.lowStockCount) / stats.totalStockProducts) * 100)
      : 100

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

    return {
      kpiCards,
      activities,
      gauges,
      chartData,
      paymentData,
    }
  }, [stats, recentDocs, salesInvoices, monthlyData])

  const filteredChartData = React.useMemo(() => {
    if (periodFilter === "all") return chartData
    const monthsToKeep: Record<PeriodFilter, number> = {
      "1m": 1,
      "3m": 3,
      "6m": 6,
      "1y": 12,
      "all": chartData.length,
    }
    const keep = monthsToKeep[periodFilter]
    return chartData.slice(-keep)
  }, [chartData, periodFilter])

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
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Dernière mise à jour : {lastUpdated}</p>
        <div className="flex gap-1 border rounded-lg p-1 bg-muted/30" role="tablist" aria-label="Mode de vue">
          <Button
            variant={viewMode === "classic" ? "default" : "ghost"}
            size="xs"
            onClick={() => setViewMode("classic")}
            className="gap-1.5"
            role="tab"
            aria-selected={viewMode === "classic"}
            aria-label="Vue classique"
          >
            <HugeiconsIcon icon={LayoutIcon} strokeWidth={2} className="size-4" />
            <span className="hidden sm:inline">Classique</span>
          </Button>
          <Button
            variant={viewMode === "enhanced" ? "default" : "ghost"}
            size="xs"
            onClick={() => setViewMode("enhanced")}
            className="gap-1.5"
            role="tab"
            aria-selected={viewMode === "enhanced"}
            aria-label="Vue avancée"
          >
            <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="size-4" />
            <span className="hidden sm:inline">Avancée</span>
          </Button>
        </div>
      </div>

      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {viewMode === "enhanced" ? "Vue avancée activée" : "Vue classique activée"}
      </div>

      {viewMode === "enhanced" ? (
        <>
          <EnhancedDashboardView
            title="Tableau de bord"
            description="Vue d'ensemble de vos activités commerciales"
            kpiCards={kpiCards}
            charts={[
              {
                id: "sales-vs-purchases",
                title: "Ventes vs Achats",
                description: "Comparaison mensuelle des ventes et achats",
                data: filteredChartData,
                series: [
                  { key: "ventes", label: "Ventes", color: "hsl(142, 76%, 36%)" },
                  { key: "achats", label: "Achats", color: "hsl(262, 83%, 58%)" },
                ],
                chartType: "area",
                defaultTimeRange: "90d",
              },
            ]}
            activities={activities}
            gauges={gauges}
            onRefresh={handleRefresh}
            onExport={handleExport}
            onSettings={() => setShowThemeCustomizer(true)}
            showViewToggle
          />
          <DashboardAlerts
            lowStockCount={stats.lowStockCount}
            unpaidInvoices={unpaidInvoices ?? undefined}
          />
        </>
      ) : (
        <>
          {/* Period filter for classic view */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Période :</span>
            <div className="flex gap-1 border rounded-lg p-1 bg-muted/30" role="tablist" aria-label="Filtre de période">
              {(Object.keys(periodLabels) as PeriodFilter[]).map((period) => (
                <Button
                  key={period}
                  variant={periodFilter === period ? "default" : "ghost"}
                  size="xs"
                  onClick={() => setPeriodFilter(period)}
                  role="tab"
                  aria-selected={periodFilter === period}
                  aria-label={periodLabels[period]}
                >
                  {periodLabels[period]}
                </Button>
              ))}
            </div>
          </div>

          <DashboardView
            initialStats={stats}
            initialRecentDocs={recentDocs}
            paymentData={paymentData}
            monthlyData={monthlyData}
            salesInvoices={salesInvoices}
            lastUpdated={lastUpdated}
          />
        </>
      )}

      <ThemeCustomizer
        onThemeChange={(theme) => {
          const root = document.documentElement
          root.style.setProperty("--primary", theme.primary)
          root.style.setProperty("--accent", theme.accent)
          root.style.setProperty("--background", theme.background)
          root.style.setProperty("--foreground", theme.foreground)
          root.style.setProperty("--radius", `${theme.radius}px`)
          localStorage.setItem("dashboard-theme", JSON.stringify(theme))
          toast.success("Thème appliqué")
        }}
        trigger={<span className="hidden" />}
      />

      {showThemeCustomizer && (
        <ThemeCustomizer
          onThemeChange={(theme) => {
            const root = document.documentElement
            root.style.setProperty("--primary", theme.primary)
            root.style.setProperty("--accent", theme.accent)
            root.style.setProperty("--background", theme.background)
            root.style.setProperty("--foreground", theme.foreground)
            root.style.setProperty("--radius", `${theme.radius}px`)
            localStorage.setItem("dashboard-theme", JSON.stringify(theme))
            setShowThemeCustomizer(false)
            toast.success("Thème appliqué")
          }}
        />
      )}
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
