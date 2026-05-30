"use client"

import * as React from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SafeIcon as HugeiconsIcon } from "@/components/ui/safe-icon"
import {
  RefreshIcon,
  Download02Icon,
  UserGroupIcon,
  TruckIcon,
  Package01Icon,
  SaleTag01Icon,
  ShoppingCart01Icon,
  Money01Icon,
  Invoice01Icon,
  Alert02Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
} from "@hugeicons/core-free-icons"
import { PerformanceGauge } from "@/components/dashboard/enhanced/performance-gauge"
import type {
  DashboardStats,
  DocumentWithComputed,
  MonthlyDataPoint,
  SalesInvoice,
} from "@/lib/types"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

const formatMAD = (amount: number) =>
  amount.toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " MAD"

interface CommandCenterProps {
  stats: DashboardStats
  recentDocs: DocumentWithComputed[]
  salesInvoices: SalesInvoice[]
  monthlyData: MonthlyDataPoint[]
  onRefresh?: () => void
  onExport?: () => void
}

export function CommandCenter({
  stats,
  recentDocs,
  salesInvoices,
  monthlyData,
  onRefresh,
  onExport,
}: CommandCenterProps) {
  const { paymentPct, stockPct, unpaidCount, unpaidTotal } = React.useMemo(() => {
    let regle = 0
    let unpaidTotal = 0
    salesInvoices.forEach((inv) => {
      const ttc = Number(inv.montant_ttc)
      const reg = inv.montant_regle
      if (reg > 0 && reg >= ttc) regle++
      else unpaidTotal += ttc - reg
    })
    const unpaidCount = salesInvoices.length - regle
    const paymentPct = stats.salesCount > 0 ? Math.round((regle / stats.salesCount) * 100) : 0
    const stockPct = stats.totalStockProducts > 0
      ? Math.round(((stats.totalStockProducts - stats.lowStockCount) / stats.totalStockProducts) * 100)
      : 100
    return { paymentPct, stockPct, unpaidCount, unpaidTotal }
  }, [salesInvoices, stats])

  const chartData = monthlyData.map((m) => ({
    month: m.month,
    Ventes: m.ventes,
    Achats: m.achats,
  }))

  const kpiItems = [
    { label: "Clients", value: stats.clients, icon: UserGroupIcon, href: "/customers" },
    { label: "Fournisseurs", value: stats.suppliers, icon: TruckIcon, href: "/suppliers" },
    { label: "Articles", value: stats.products, icon: Package01Icon, href: "/articles" },
    { label: "Ventes", value: stats.salesCount, icon: SaleTag01Icon, href: "/sales" },
    { label: "Achats", value: stats.purchasesCount, icon: ShoppingCart01Icon, href: "/purchases" },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Hero — Gauges + Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1 bg-gradient-to-br from-success/5 to-success/10 border-success/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-success">Santé du stock</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <div className="shrink-0">
              <PerformanceGauge
                title="Stock"
                value={stockPct}
                thresholds={[
                  { value: 25, label: "Critique", color: "#ef4444" },
                  { value: 50, label: "Faible", color: "#f97316" },
                  { value: 75, label: "Bon", color: "#eab308" },
                  { value: 100, label: "Optimal", color: "#22c55e" },
                ]}
                size="sm"
                showPercentage
              />
            </div>
            <div className="text-sm">
              <p className="font-bold">{stats.lowStockCount} article{stats.lowStockCount > 1 ? "s" : ""} en alerte</p>
              <p className="text-muted-foreground">{stats.totalStockProducts} références totales</p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-1 bg-gradient-to-br from-warning/5 to-warning/10 border-warning/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-warning">Paiements</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <div className="shrink-0">
              <PerformanceGauge
                title="Paiements"
                value={paymentPct}
                thresholds={[
                  { value: 25, label: "Critique", color: "#ef4444" },
                  { value: 50, label: "En cours", color: "#f97316" },
                  { value: 75, label: "Bon", color: "#eab308" },
                  { value: 100, label: "Excellent", color: "#22c55e" },
                ]}
                size="sm"
                showPercentage
              />
            </div>
            <div className="text-sm">
              <p className="font-bold">{unpaidCount} facture{unpaidCount > 1 ? "s" : ""} impayée{unpaidCount > 1 ? "s" : ""}</p>
              <p className="text-muted-foreground">{formatMAD(unpaidTotal)} restant dû</p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Actions rapides</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {onRefresh && (
              <Button size="xs" variant="outline" onClick={onRefresh} className="gap-1">
                <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} className="size-3.5" />
                Actualiser
              </Button>
            )}
            {onExport && (
              <Button size="xs" variant="outline" onClick={onExport} className="gap-1">
                <HugeiconsIcon icon={Download02Icon} strokeWidth={2} className="size-3.5" />
                Export CSV
              </Button>
            )}
            <Link href="/sales/new">
              <Button size="xs" variant="default" className="gap-1">
                <HugeiconsIcon icon={SaleTag01Icon} strokeWidth={2} className="size-3.5" />
                Nouvelle vente
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Horizontal scrollable KPI strip */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
        {kpiItems.map((kpi) => (
          <Link key={kpi.label} href={kpi.href} className="shrink-0">
            <Card className="w-36 hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-3 flex flex-col items-center gap-1 text-center">
                <HugeiconsIcon icon={kpi.icon} strokeWidth={2} className="size-5 text-primary" />
                <span className="text-2xl font-bold">{kpi.value}</span>
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Main content: chart + activity side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Ventes vs Achats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                    formatter={(value: number) => formatMAD(value)}
                  />
                  <Bar dataKey="Ventes" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Achats" fill="hsl(262, 83%, 58%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Activité récente</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y max-h-[220px] overflow-y-auto">
                {recentDocs.slice(0, 4).map((doc) => (
                  <Link
                    key={doc.id_document}
                    href={`/documents/${doc.id_document}`}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-sm"
                  >
                    <div className="size-7 rounded bg-primary/10 flex items-center justify-center shrink-0">
                      <HugeiconsIcon icon={Invoice01Icon} strokeWidth={2} className="size-3.5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{doc.numero_piece}</p>
                      <p className="text-xs text-muted-foreground truncate">{doc.partenaire?.nom_partenaire}</p>
                    </div>
                    <Badge variant={doc.montant_regle >= Number(doc.montant_ttc) ? "success" : "warning"} className="text-[10px]">
                      {doc.montant_regle >= Number(doc.montant_ttc) ? "Réglé" : "En cours"}
                    </Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {(stats.lowStockCount > 0 || unpaidCount > 0) && (
            <div className="flex gap-2">
              {stats.lowStockCount > 0 && (
                <Card className="flex-1 border-warning/30 bg-warning/5">
                  <CardContent className="p-3 flex items-center gap-2">
                    <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-4 text-warning shrink-0" />
                    <span className="text-xs font-medium">{stats.lowStockCount} stock faible</span>
                  </CardContent>
                </Card>
              )}
              {unpaidCount > 0 && (
                <Card className="flex-1 border-destructive/30 bg-destructive/5">
                  <CardContent className="p-3 flex items-center gap-2">
                    <HugeiconsIcon icon={Invoice01Icon} strokeWidth={2} className="size-4 text-destructive shrink-0" />
                    <span className="text-xs font-medium">{unpaidCount} impayée{unpaidCount > 1 ? "s" : ""}</span>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Financial summary bar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Chiffre d'affaires</p>
              <p className="text-lg font-bold text-success">{formatMAD(stats.totalSalesAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total achats</p>
              <p className="text-lg font-bold text-info">{formatMAD(stats.totalPurchasesAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Marge brute</p>
              <p className="text-lg font-bold text-primary">
                {formatMAD(Math.max(0, stats.totalSalesAmount - stats.totalPurchasesAmount))}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
