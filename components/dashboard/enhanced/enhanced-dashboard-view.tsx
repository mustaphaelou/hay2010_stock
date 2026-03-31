"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { InteractiveChartCard, type ChartType, type TimeRange, type DataPoint } from "./interactive-chart-card"
import type { StatsOverviewCardProps } from "./stats-overview-card"
import { RealtimeMetricsGrid } from "./realtime-metrics-grid"
import { DashboardHeader, type BreadcrumbItemType } from "./dashboard-header"
import { RecentActivityFeed, type ActivityItem } from "./recent-activity-feed"
import { PerformanceGauge, type Threshold } from "./performance-gauge"
import { SafeIcon as HugeiconsIcon } from "@/components/ui/safe-icon"
import {
  LayoutGridIcon,
  LayoutIcon,
} from "@hugeicons/core-free-icons"

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

interface GaugeData {
  id: string
  title: string
  description?: string
  value: number
  max?: number
  thresholds?: Threshold[]
}

interface EnhancedDashboardViewProps {
  title?: string
  description?: string
  breadcrumbs?: BreadcrumbItemType[]
  kpiCards?: KPICard[]
  charts?: ChartData[]
  activities?: ActivityData[]
  gauges?: GaugeData[]
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
  title = "Dashboard",
  description = "Overview of your business metrics",
  breadcrumbs = [],
  kpiCards = [],
  charts = [],
  activities = [],
  gauges = [],
  loading = false,
  className,
  onRefresh,
  onExport,
  onSettings,
  showViewToggle = false,
}: EnhancedDashboardViewProps) {
  const [viewMode, setViewMode] = React.useState<"grid" | "compact">("grid")
  const [isRefreshing, setIsRefreshing] = React.useState(false)

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

  const metricsData = React.useMemo(() => kpiCards, [kpiCards])

  const defaultBreadcrumbs: BreadcrumbItemType[] = React.useMemo(() => {
    if (breadcrumbs.length > 0) return breadcrumbs
    return [
      { label: "Home", href: "/" },
      { label: "Dashboard" },
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
        onSettings={onSettings}
        isLoading={isRefreshing}
      >
        {showViewToggle && (
          <div className="flex gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="xs"
              onClick={() => setViewMode("grid")}
              aria-label="Grid view"
            >
              <HugeiconsIcon icon={LayoutGridIcon} strokeWidth={2} className="size-4" />
            </Button>
            <Button
              variant={viewMode === "compact" ? "default" : "ghost"}
              size="xs"
              onClick={() => setViewMode("compact")}
              aria-label="Compact view"
            >
              <HugeiconsIcon icon={LayoutIcon} strokeWidth={2} className="size-4" />
            </Button>
          </div>
        )}
      </DashboardHeader>

      {kpiCards.length > 0 && (
        <section aria-label="Key Performance Indicators">
          <RealtimeMetricsGrid
            metrics={metricsData}
            columns={4}
            animated
          />
        </section>
      )}

      <div className={cn(
        "grid gap-6",
        viewMode === "grid" ? "lg:grid-cols-2" : "lg:grid-cols-1"
      )}>
        {charts.map((chart) => (
          <InteractiveChartCard
            key={chart.id}
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
        ))}
      </div>

      <div className={cn(
        "grid gap-6",
        viewMode === "grid" ? "lg:grid-cols-3" : "lg:grid-cols-2"
      )}>
        {activities.length > 0 && (
          <div className={cn(viewMode === "grid" ? "lg:col-span-2" : "")}>
            <RecentActivityFeed
              items={activities}
              title="Recent Activity"
              maxItems={5}
              showViewAll
              viewAllHref="/activity"
            />
          </div>
        )}

        {gauges.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {gauges.map((gauge) => (
              <PerformanceGauge
                key={gauge.id}
                title={gauge.title}
                description={gauge.description}
                value={gauge.value}
                max={gauge.max}
                thresholds={gauge.thresholds}
                size="sm"
                showPercentage
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
})

export type { EnhancedDashboardViewProps, ChartData, ActivityData, GaugeData }
