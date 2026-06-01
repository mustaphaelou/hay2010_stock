"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChartLoadingFallback, ErrorBoundary } from "./lazy-components"
import { InteractiveChartCard, type ChartType, type TimeRange, type DataPoint } from "./interactive-chart-card"
import type { StatsOverviewCardProps } from "./stats-overview-card"
import { RealtimeMetricsGrid } from "./realtime-metrics-grid"
import { DashboardHeader, type BreadcrumbItemType } from "./dashboard-header"
import { RecentActivityFeed, type ActivityItem } from "./recent-activity-feed"
import { LowStockList } from "@/components/dashboard/widgets/low-stock-list"
import { TopProductsWidget, type TopProduct } from "@/components/dashboard/widgets/top-products-widget"
import { ThemeCustomizer } from "./theme-customizer"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import { useIsMobile } from "@/lib/hooks/use-breakpoint"
import { SafeIcon as HugeiconsIcon } from "@/components/ui/safe-icon"
import {
  LayoutGridIcon,
  LayoutIcon,
} from "@hugeicons/core-free-icons"
import type { DashboardLowStockItem } from "@/lib/types"

interface KPICard extends Omit<StatsOverviewCardProps, "value"> {
  id: string
  title: string
  value: number | string
  href?: string
}

interface ChartData {
  id: string
  title: string
  description?: string
  data: DataPoint[]
  series: { key: string; label: string; color?: string }[]
  chartType?: ChartType
  defaultTimeRange?: TimeRange
}

type ActivityData = ActivityItem

interface TableColumn {
  key: string
  label: string
  align?: 'left' | 'right'
  format?: 'currency' | 'percentage' | 'number'
}

interface EnhancedDashboardViewProps {
  title?: string
  description?: string
  breadcrumbs?: BreadcrumbItemType[]
  kpiCards?: KPICard[]
  charts?: ChartData[]
  activities?: ActivityData[]
  table?: {
    columns: TableColumn[]
    rows: Record<string, unknown>[]
  }
  lowStockItems?: DashboardLowStockItem[]
  topProducts?: TopProduct[]
  loading?: boolean
  className?: string
  onRefresh?: () => void
  onExport?: () => void
  onSettings?: () => void
  showViewToggle?: boolean
}

const LoadingSkeleton = React.memo(function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-muted/50 rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-[400px] bg-muted/50 rounded-xl animate-pulse" />
        <div className="h-[400px] bg-muted/50 rounded-xl animate-pulse" />
      </div>
    </div>
  )
})

export const EnhancedDashboardView = React.memo(function EnhancedDashboardView({
  title = "Tableau de bord",
  description = "Vue d'ensemble de vos activités commerciales",
  breadcrumbs = [],
  kpiCards = [],
  charts = [],
  activities = [],
  table,
  lowStockItems,
  topProducts,
  loading = false,
  className,
  onRefresh,
  onExport,
  onSettings,
  showViewToggle = false,
}: EnhancedDashboardViewProps) {
  const [viewMode, setViewMode] = React.useState<"grid" | "compact">("grid")
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [showThemeCustomizer, setShowThemeCustomizer] = React.useState(false)
  const prefersReducedMotion = useReducedMotion()
  const isMobile = useIsMobile()

  const handleRefresh = React.useCallback(async () => {
    if (onRefresh) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }
  }, [onRefresh])

  const handleSettings = React.useCallback(() => {
    setShowThemeCustomizer((prev) => !prev)
    onSettings?.()
  }, [onSettings])

  const formatValue = React.useCallback((value: unknown, col?: TableColumn): string => {
    if (col?.format === 'currency') {
      const num = Number(value)
      return num.toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MAD'
    }
    if (col?.format === 'percentage') {
      return `${Number(value)}%`
    }
    if (col?.format === 'number') {
      return Number(value).toLocaleString('fr-MA')
    }
    return String(value ?? '')
  }, [])

  const metricsData = React.useMemo(() => kpiCards, [kpiCards])

  const defaultBreadcrumbs: BreadcrumbItemType[] = React.useMemo(() => {
    if (breadcrumbs.length > 0) return breadcrumbs
    return [
      { label: "Accueil", href: "/" },
      { label: "Tableau de bord" },
    ]
  }, [breadcrumbs])

  if (loading) {
    return (
      <div className={cn("flex flex-col gap-6", className)}>
        <DashboardHeader
          title={title}
          description={description}
          breadcrumbs={defaultBreadcrumbs}
          isLoading={loading}
        />
        <LoadingSkeleton />
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <DashboardHeader
        title={title}
        description={description}
        breadcrumbs={defaultBreadcrumbs}
        onRefresh={handleRefresh}
        onExport={onExport}
        onSettings={handleSettings}
        isLoading={isRefreshing}
      >
        {showViewToggle && (
          <div className="flex gap-1 border rounded-lg p-1" role="tablist" aria-label="Affichage">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="xs"
              onClick={() => setViewMode("grid")}
              aria-label="Vue grille"
              role="tab"
              aria-selected={viewMode === "grid"}
            >
              <HugeiconsIcon icon={LayoutGridIcon} strokeWidth={2} className="size-4" />
            </Button>
            <Button
              variant={viewMode === "compact" ? "default" : "ghost"}
              size="xs"
              onClick={() => setViewMode("compact")}
              aria-label="Vue compacte"
              role="tab"
              aria-selected={viewMode === "compact"}
            >
              <HugeiconsIcon icon={LayoutIcon} strokeWidth={2} className="size-4" />
            </Button>
          </div>
        )}
      </DashboardHeader>

      <ThemeCustomizer
        onThemeChange={() => setShowThemeCustomizer(false)}
        trigger={showThemeCustomizer ? <div /> : undefined}
      />

      {kpiCards.length > 0 && (
        <section aria-label="Indicateurs clés de performance" aria-live="polite">
          <RealtimeMetricsGrid
            metrics={metricsData}
            columns={isMobile ? 2 : 4}
            animated={!prefersReducedMotion}
          />
        </section>
      )}

      <div className={cn(
        "grid gap-6",
        viewMode === "grid" ? "lg:grid-cols-2" : "lg:grid-cols-1"
      )}>
        {charts.map((chart) => (
          <ErrorBoundary key={chart.id} fallback={<ChartLoadingFallback height={300} />}>
            <React.Suspense fallback={<ChartLoadingFallback height={300} />}>
              <InteractiveChartCard
                title={chart.title}
                description={chart.description}
                data={chart.data}
                series={chart.series}
                chartType={chart.chartType}
                defaultTimeRange={chart.defaultTimeRange}
                enableTimeRangeSelector
                enableChartTypeSelector
                height={300}
              />
            </React.Suspense>
          </ErrorBoundary>
        ))}
      </div>

      {activities.length > 0 && (
        <RecentActivityFeed
          items={activities}
          title="Activité récente"
          maxItems={5}
          showViewAll
          viewAllHref="/documents"
        />
      )}

      {table && table.columns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Tableau de Performance Mensuelle</CardTitle>
            <CardDescription>Rapprochement chiffré des ventes, dépenses et taux de rentabilité.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase">
                    {table.columns.map((col) => (
                      <th
                        key={col.key}
                        className={cn(
                          "px-4 py-3",
                          col.align === "right" ? "text-right" : "text-left"
                        )}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {table.rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      {table.columns.map((col) => (
                        <td
                          key={col.key}
                          className={cn(
                            "px-4 py-3",
                            col.align === "right" ? "text-right font-medium" : "font-medium"
                          )}
                        >
                          {formatValue(row[col.key], col)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {(lowStockItems || topProducts) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {lowStockItems && (
            <LowStockList
              items={lowStockItems}
              title="Alertes stock"
              description="Produits à réapprovisionner"
            />
          )}
          {topProducts && (
            <TopProductsWidget
              products={topProducts}
              title="Top Produits"
              description="Produits les plus vendus"
              maxItems={5}
            />
          )}
        </div>
      )}
    </div>
  )
})

export type { EnhancedDashboardViewProps, ChartData, ActivityData, TableColumn }
