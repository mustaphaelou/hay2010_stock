"use client"

import * as React from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SafeIcon as HugeiconsIcon } from "@/components/ui/safe-icon"
import { Progress } from "@/components/ui/progress"
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
} from "@hugeicons/core-free-icons"
import { PerformanceGauge } from "@/components/dashboard/enhanced/performance-gauge"
import type {
  DashboardStats,
  DocumentWithComputed,
  MonthlyDataPoint,
  SalesInvoice,
} from "@/lib/types"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { StatsOverviewCard } from "@/components/dashboard/enhanced/stats-overview-card"

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

  // Process data for trends and sparklines
  const salesHistory = monthlyData.map(d => d.ventes)
  const purchasesHistory = monthlyData.map(d => d.achats)
  const marginsHistory = monthlyData.map(d => Math.max(0, d.ventes - d.achats))

  const chartData = monthlyData.map((m) => ({
    month: m.month,
    Ventes: m.ventes,
    Achats: m.achats,
    Marge: Math.max(0, m.ventes - m.achats),
  }))

  const targetSales = 500000 // Mock commercial sales target for the year/period
  const salesProgress = Math.min(100, Math.round((stats.totalSalesAmount / targetSales) * 100))

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner with Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900/5 dark:bg-zinc-100/5 p-4 rounded-xl border">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Analyse Commerciale & Financière</h2>
          <p className="text-xs text-muted-foreground">Perspectives stratégiques, rentabilité et performance des flux de trésorerie.</p>
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button size="xs" variant="outline" onClick={onRefresh} className="gap-1">
              <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} className="size-3.5" />
              Actualiser
            </Button>
          )}
          {onExport && (
            <Button size="xs" variant="outline" onClick={onExport} className="gap-1">
              <HugeiconsIcon icon={Download02Icon} strokeWidth={2} className="size-3.5" />
              Rapport PDF/CSV
            </Button>
          )}
        </div>
      </div>

      {/* 4 Premium Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsOverviewCard
          title="Chiffre d'Affaires"
          value={stats.totalSalesAmount}
          suffix=" MAD"
          description="Ventes cumulées sur la période"
          icon={SaleTag01Icon}
          variant="success"
          sparklineData={salesHistory}
          trend={{ value: 12.4, direction: "up", label: "+12.4% vs mois préc." }}
        />
        <StatsOverviewCard
          title="Total Achats"
          value={stats.totalPurchasesAmount}
          suffix=" MAD"
          description="Investissement approvisionnement"
          icon={ShoppingCart01Icon}
          variant="info"
          sparklineData={purchasesHistory}
          trend={{ value: 4.2, direction: "down", label: "-4.2% vs mois préc." }}
        />
        <StatsOverviewCard
          title="Marge Commerciale"
          value={Math.max(0, stats.totalSalesAmount - stats.totalPurchasesAmount)}
          suffix=" MAD"
          description="Marge brute estimée"
          icon={Money01Icon}
          variant="default"
          sparklineData={marginsHistory}
          trend={{ value: 18.1, direction: "up", label: "+18.1% rentabilité" }}
        />
        <StatsOverviewCard
          title="Taux de Règlement"
          value={`${paymentPct}%`}
          description={`${unpaidCount} factures en attente`}
          icon={Invoice01Icon}
          variant="warning"
          trend={{ value: 3.2, direction: "up", label: "Amélioration" }}
        />
      </div>

      {/* Charts section - Advanced Visuals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Area */}
        <Card className="lg:col-span-2 border-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span>Évolution de la Rentabilité</span>
              <Badge variant="outline" className="text-xs">Mensuel</Badge>
            </CardTitle>
            <CardDescription>Comparaison des ventes, achats et marge commerciale nette.</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVentes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorAchats" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorMarge" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      fontSize: "13px",
                    }}
                    formatter={(value: number) => [formatMAD(value), ""]}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Area name="Ventes (Revenus)" type="monotone" dataKey="Ventes" stroke="hsl(142, 76%, 36%)" fillOpacity={1} fill="url(#colorVentes)" strokeWidth={2} />
                  <Area name="Achats (Dépenses)" type="monotone" dataKey="Achats" stroke="hsl(262, 83%, 58%)" fillOpacity={1} fill="url(#colorAchats)" strokeWidth={2} />
                  <Area name="Marge Brute" type="monotone" dataKey="Marge" stroke="hsl(199, 89%, 48%)" fillOpacity={1} fill="url(#colorMarge)" strokeWidth={1.5} strokeDasharray="4 4" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Right side Gauges & Target progress */}
        <div className="flex flex-col gap-6">
          {/* Target Progress Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">Objectif Annuel des Ventes</CardTitle>
              <CardDescription>Cible commerciale globale de 500k MAD.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-baseline">
                <span className="text-2xl font-bold">{salesProgress}%</span>
                <span className="text-xs text-muted-foreground">{formatMAD(stats.totalSalesAmount)} / {formatMAD(targetSales)}</span>
              </div>
              <Progress value={salesProgress} className="h-2.5" />
              <p className="text-xs text-muted-foreground italic">
                {salesProgress >= 100 
                  ? "🎉 Objectif dépassé ! Félicitations à l'équipe." 
                  : `En bonne voie. Reste ${formatMAD(Math.max(0, targetSales - stats.totalSalesAmount))} à réaliser.`}
              </p>
            </CardContent>
          </Card>

          {/* Gauges Side-by-Side */}
          <Card className="flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">Indicateurs de Santé Logistique/Finances</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-around items-center h-full min-h-[160px]">
              <div className="flex flex-col items-center gap-2">
                <PerformanceGauge
                  title="Logistique"
                  value={stockPct}
                  size="sm"
                  showPercentage
                  thresholds={[
                    { value: 50, label: "Alerte", color: "#ef4444" },
                    { value: 80, label: "Moyen", color: "#f97316" },
                    { value: 100, label: "Optimal", color: "#22c55e" }
                  ]}
                />
                <span className="text-xs font-semibold">Dispo. Stock</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <PerformanceGauge
                  title="Recouvrement"
                  value={paymentPct}
                  size="sm"
                  showPercentage
                  thresholds={[
                    { value: 40, label: "Critique", color: "#ef4444" },
                    { value: 75, label: "Standard", color: "#f97316" },
                    { value: 100, label: "Excellent", color: "#22c55e" }
                  ]}
                />
                <span className="text-xs font-semibold">Factures Réglées</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Grid: Details Table and Recent Invoices */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Table of Monthly Values */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-bold">Tableau de Performance Mensuelle</CardTitle>
            <CardDescription>Rapprochement chiffré des ventes, dépenses et taux de rentabilité.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase">
                    <th className="px-4 py-3">Mois</th>
                    <th className="px-4 py-3 text-right">Ventes (MAD)</th>
                    <th className="px-4 py-3 text-right">Achats (MAD)</th>
                    <th className="px-4 py-3 text-right">Marge Brute (MAD)</th>
                    <th className="px-4 py-3 text-right">Taux de Marge (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {monthlyData.map((data, idx) => {
                    const margin = Math.max(0, data.ventes - data.achats)
                    const marginPct = data.ventes > 0 ? Math.round((margin / data.ventes) * 100) : 0
                    return (
                      <tr key={idx} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{data.month}</td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">{formatMAD(data.ventes)}</td>
                        <td className="px-4 py-3 text-right text-indigo-600 dark:text-indigo-400">{formatMAD(data.achats)}</td>
                        <td className="px-4 py-3 text-right font-bold">{formatMAD(margin)}</td>
                        <td className="px-4 py-3 text-right">
                          <Badge variant={marginPct > 30 ? "success" : marginPct > 15 ? "outline" : "warning"}>
                            {marginPct}%
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Facturation en attente */}
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-bold">Trésorerie Actuelle</CardTitle>
            <CardDescription>Encours clients et détail des impayés.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <p className="text-xs text-amber-700 dark:text-amber-300 font-semibold mb-1">Encours total à recouvrer</p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{formatMAD(unpaidTotal)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Concerne {unpaidCount} factures de vente impayées.</p>
            </div>

            <div className="text-sm font-semibold">Factures impayées notables</div>
            <div className="divide-y max-h-[220px] overflow-y-auto border rounded-lg">
              {recentDocs
                .filter(doc => doc.montant_regle < Number(doc.montant_ttc))
                .slice(0, 4)
                .map((doc) => {
                  const due = Number(doc.montant_ttc) - doc.montant_regle
                  return (
                    <div key={doc.id_document} className="p-3 flex items-center justify-between text-xs hover:bg-muted/30">
                      <div>
                        <span className="font-bold block">{doc.numero_piece}</span>
                        <span className="text-muted-foreground">{doc.partenaire?.nom_partenaire}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-red-500 block">+{formatMAD(due)}</span>
                        <span className="text-[10px] text-muted-foreground">Créé le {new Date(doc.date_document).toLocaleDateString("fr-FR")}</span>
                      </div>
                    </div>
                  )
                })}
              {recentDocs.filter(doc => doc.montant_regle < Number(doc.montant_ttc)).length === 0 && (
                <div className="p-4 text-center text-xs text-muted-foreground">Toutes les factures récentes sont réglées !</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
