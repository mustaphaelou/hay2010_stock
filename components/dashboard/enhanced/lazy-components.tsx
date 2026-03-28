"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const LazyInteractiveChartCard = React.lazy(() =>
  import("./interactive-chart-card").then((mod) => ({ default: mod.InteractiveChartCard }))
)

const LazyPerformanceGauge = React.lazy(() =>
  import("./performance-gauge").then((mod) => ({ default: mod.PerformanceGauge }))
)

const LazyEnhancedDataTable = React.lazy(() =>
  import("./enhanced-data-table").then((mod) => ({ default: mod.EnhancedDataTable }))
)

function ChartLoadingFallback({ height = 300 }: { height?: number }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between gap-4">
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4" style={{ height }}>
          <div className="flex justify-between gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="flex-1 w-full" style={{ height: height - 60 }} />
        </div>
      </CardContent>
    </Card>
  )
}

function GaugeLoadingFallback() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="text-center pb-2">
        <Skeleton className="h-4 w-24 mx-auto" />
      </CardHeader>
      <CardContent className="flex justify-center pb-4">
        <div className="flex flex-col items-center gap-3">
          <div className="size-44 relative">
            <Skeleton className="absolute inset-0 rounded-full" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      </CardContent>
    </Card>
  )
}

function TableLoadingFallback() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="rounded-md border">
        <div className="p-4">
          {Array.from({ length: 5 }).map((_, rowIndex) => (
            <div key={rowIndex} className="flex gap-4 py-3">
              {Array.from({ length: 5 }).map((_, colIndex) => (
                <Skeleton key={colIndex} className="h-4 flex-1 max-w-[120px]" />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
    </div>
  )
}

interface LazyLoadProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  height?: number
  className?: string
}

const LazyLoad = React.memo(function LazyLoad({
  children,
  fallback,
  height = 300,
  className,
}: LazyLoadProps) {
  const [isVisible, setIsVisible] = React.useState(false)
  const [hasError, setHasError] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  if (hasError) {
    return (
      <div className={cn("flex items-center justify-center", className)} style={{ height }}>
        <p className="text-muted-foreground">Failed to load component</p>
      </div>
    )
  }

  return (
    <div ref={ref} className={className} style={{ minHeight: isVisible ? undefined : height }}>
      {isVisible ? (
        <React.Suspense fallback={fallback || <Skeleton className="w-full h-full" />}>
          <React.ErrorBoundary fallback={<div>Something went wrong</div>}>
            {children}
          </React.ErrorBoundary>
        </React.Suspense>
      ) : (
        fallback || <Skeleton className="w-full" style={{ height }} />
      )}
    </div>
  )
})

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Something went wrong</div>
    }
    return this.props.children
  }
}

interface LazyInteractiveChartCardProps extends React.ComponentProps<typeof LazyInteractiveChartCard> {
  height?: number
}

function LazyInteractiveChartCardWrapper(props: LazyInteractiveChartCardProps) {
  const { height = 300, ...rest } = props as { height?: number } & Record<string, unknown>
  return (
    <React.Suspense fallback={<ChartLoadingFallback height={height} />}>
      <LazyInteractiveChartCard {...rest} />
    </React.Suspense>
  )
}

function LazyPerformanceGaugeWrapper(props: React.ComponentProps<typeof LazyPerformanceGauge>) {
  return (
    <React.Suspense fallback={<GaugeLoadingFallback />}>
      <LazyPerformanceGauge {...props} />
    </React.Suspense>
  )
}

function LazyEnhancedDataTableWrapper<TData, TValue>(props: React.ComponentProps<typeof LazyEnhancedDataTable<TData, TValue>>) {
  return (
    <React.Suspense fallback={<TableLoadingFallback />}>
      <LazyEnhancedDataTable {...props} />
    </React.Suspense>
  )
}

export {
  LazyLoad,
  LazyInteractiveChartCardWrapper as LazyInteractiveChartCard,
  LazyPerformanceGaugeWrapper as LazyPerformanceGauge,
  LazyEnhancedDataTableWrapper as LazyEnhancedDataTable,
  ChartLoadingFallback,
  GaugeLoadingFallback,
  TableLoadingFallback,
  ErrorBoundary,
}

export type { LazyLoadProps }
