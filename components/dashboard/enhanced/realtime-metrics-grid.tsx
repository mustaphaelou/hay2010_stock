"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { StatsOverviewCard, type StatsOverviewCardProps } from "./stats-overview-card"
import { Skeleton } from "@/components/ui/skeleton"

interface MetricConfig extends Omit<StatsOverviewCardProps, "value"> {
  id: string
  value: number | string
  href?: string
  onClick?: () => void
}

interface RealtimeMetricsGridProps {
  metrics: MetricConfig[]
  columns?: 1 | 2 | 3 | 4 | 5 | 6
  loading?: boolean
  className?: string
  animated?: boolean
  staggerDelay?: number
  onMetricClick?: (metric: MetricConfig) => void
}

const gridColsMap = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
  6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
}

function MetricSkeleton() {
  return (
    <div className="rounded-xl border border-border/50 p-4 space-y-3">
      <div className="flex justify-between items-start">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  )
}

const ANIMATION_CLASSES = [
  "animate-fade-in-up",
  "animate-fade-in-up",
  "animate-fade-in-up",
  "animate-fade-in-up",
  "animate-fade-in-up",
  "animate-fade-in-up",
]

export function RealtimeMetricsGrid({
  metrics,
  columns = 4,
  loading = false,
  className,
  animated = true,
  staggerDelay = 50,
  onMetricClick,
}: RealtimeMetricsGridProps) {
  const [visibleMetrics, setVisibleMetrics] = React.useState<typeof metrics>([])
  const [isTransitioning, setIsTransitioning] = React.useState(false)

  React.useEffect(() => {
    if (animated && metrics.length > 0) {
      setIsTransitioning(true)
      setVisibleMetrics([])
      
      metrics.forEach((_, index) => {
        setTimeout(() => {
          setVisibleMetrics((prev) => [...prev, metrics[index]])
          if (index === metrics.length - 1) {
            setTimeout(() => setIsTransitioning(false), 300)
          }
        }, index * staggerDelay)
      })
    } else {
      setVisibleMetrics(metrics)
    }
  }, [metrics, animated, staggerDelay])

  if (loading) {
    return (
      <div
        className={cn(
          "grid gap-4",
          gridColsMap[columns],
          className
        )}
        role="status"
        aria-label="Loading metrics"
      >
        {Array.from({ length: columns }).map((_, index) => (
          <div key={index}>
            <MetricSkeleton />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "grid gap-4",
        gridColsMap[columns],
        className
      )}
      role="region"
      aria-label="Key performance metrics"
    >
      {visibleMetrics.map((metric, index) => (
        <div
          key={metric.id}
          style={{ "--index": index } as React.CSSProperties}
          className={cn(
            "transition-all duration-300",
            ANIMATION_CLASSES[index % ANIMATION_CLASSES.length],
            isTransitioning && "animate-pulse-once"
          )}
        >
          {metric.href ? (
            <a
              href={metric.href}
              className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl"
              aria-label={`${metric.title}: ${metric.value}`}
            >
              <StatsOverviewCard
                {...metric}
                className={cn(
                  "cursor-pointer transition-shadow",
                  "hover:shadow-lg hover:shadow-primary/5"
                )}
                animated={animated}
              />
            </a>
          ) : metric.onClick || onMetricClick ? (
            <button
              onClick={() => metric.onClick?.() || onMetricClick?.(metric)}
              className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl"
              type="button"
              aria-label={`${metric.title}: ${metric.value}`}
            >
              <StatsOverviewCard
                {...metric}
                className="cursor-pointer hover:shadow-lg hover:shadow-primary/5"
                animated={animated}
              />
            </button>
          ) : (
            <StatsOverviewCard
              {...metric}
              animated={animated}
            />
          )}
        </div>
      ))}
    </div>
  )
}

export type { MetricConfig, RealtimeMetricsGridProps }
