"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert01Icon,
  Alert02Icon,
  PackageIcon,
  Wallet01Icon,
  InformationIcon,
  CheckmarkCircle01Icon,
  Delete01Icon,
  ViewIcon,
  Clock01Icon,
} from "@hugeicons/core-free-icons"

type AlertSeverity = "low" | "medium" | "high" | "critical"
type AlertType = "stock" | "payment" | "system" | "order"

interface AlertItem {
  id: string
  title: string
  message: string
  type: AlertType
  severity: AlertSeverity
  timestamp: Date | string
  isRead?: boolean
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
  onDismiss?: () => void
}

interface AlertsWidgetProps {
  alerts: AlertItem[]
  title?: string
  description?: string
  maxItems?: number
  loading?: boolean
  onAlertClick?: (alert: AlertItem) => void
  onDismiss?: (alert: AlertItem) => void
  onViewAll?: () => void
  viewAllHref?: string
  showViewAll?: boolean
  className?: string
}

const severityConfig: Record<
  AlertSeverity,
  { color: string; bgColor: string; borderColor: string; icon: typeof Alert01Icon }
> = {
  low: {
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/50",
    borderColor: "border-blue-200 dark:border-blue-800",
    icon: InformationIcon,
  },
  medium: {
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/50",
    borderColor: "border-yellow-200 dark:border-yellow-800",
    icon: Alert01Icon,
  },
  high: {
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/50",
    borderColor: "border-orange-200 dark:border-orange-800",
    icon: Alert02Icon,
  },
  critical: {
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/50",
    borderColor: "border-red-200 dark:border-red-800",
    icon: Alert02Icon,
  },
}

const typeConfig: Record<AlertType, { icon: typeof PackageIcon; label: string }> = {
  stock: { icon: PackageIcon, label: "Stock" },
  payment: { icon: Wallet01Icon, label: "Payment" },
  system: { icon: InformationIcon, label: "System" },
  order: { icon: PackageIcon, label: "Order" },
}

const severityLabels: Record<AlertSeverity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
}

function formatAlertTime(timestamp: Date | string): string {
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString("fr-FR", { month: "short", day: "numeric" })
}

function AlertSkeleton() {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border">
      <Skeleton className="size-8 rounded-lg shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-3 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
        </div>
      </div>
    </div>
  )
}

const AlertItemComponent = React.memo(function AlertItemComponent({
  alert,
  onDismiss,
  onAlertClick,
}: {
  alert: AlertItem
  onDismiss?: (alert: AlertItem) => void
  onAlertClick?: (alert: AlertItem) => void
}) {
  const config = severityConfig[alert.severity]
  const typeConf = typeConfig[alert.type]

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border transition-all",
        config.bgColor,
        config.borderColor,
        !alert.isRead && "ring-1 ring-primary/20",
        onAlertClick && "cursor-pointer hover:shadow-sm"
      )}
      onClick={() => onAlertClick?.(alert)}
      role={onAlertClick ? "button" : undefined}
      tabIndex={onAlertClick ? 0 : undefined}
      onKeyDown={
        onAlertClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onAlertClick(alert)
              }
            }
          : undefined
      }
    >
      <div
        className={cn(
          "size-8 rounded-lg flex items-center justify-center shrink-0",
          config.bgColor
        )}
      >
        <HugeiconsIcon icon={config.icon} strokeWidth={2} className={cn("size-4", config.color)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{alert.title}</span>
          <Badge
            variant="outline"
            className={cn("text-xs px-1.5", config.color, config.borderColor)}
          >
            {severityLabels[alert.severity]}
          </Badge>
          <Badge variant="secondary" className="text-xs px-1.5">
            <HugeiconsIcon icon={typeConf.icon} strokeWidth={2} className="size-3 mr-1" />
            {typeConf.label}
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{alert.message}</p>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} className="size-3" />
            {formatAlertTime(alert.timestamp)}
          </div>

          <div className="flex items-center gap-1">
            {alert.actionHref || alert.onAction ? (
              <Button
                variant="ghost"
                size="xs"
                className="h-6 px-2 text-primary"
                onClick={(e) => {
                  e.stopPropagation()
                  alert.onAction?.()
                }}
                asChild={!!alert.actionHref}
              >
                {alert.actionHref ? (
                  <a href={alert.actionHref}>
                    <HugeiconsIcon icon={ViewIcon} strokeWidth={2} className="size-3 mr-1" />
                    View
                  </a>
                ) : (
                  <>
                    <HugeiconsIcon icon={ViewIcon} strokeWidth={2} className="size-3 mr-1" />
                    View
                  </>
                )}
              </Button>
            ) : null}

            <Button
              variant="ghost"
              size="xs"
              className="h-6 px-2 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation()
                onDismiss?.(alert)
              }}
            >
              <HugeiconsIcon icon={Delete01Icon} strokeWidth={2} className="size-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
})

const AlertsWidget = React.memo(function AlertsWidget({
  alerts,
  title = "Alerts & Notifications",
  description = "Important updates and notifications",
  maxItems = 5,
  loading = false,
  onAlertClick,
  onDismiss,
  onViewAll,
  viewAllHref,
  showViewAll = true,
  className,
}: AlertsWidgetProps) {
  const [isVisible, setIsVisible] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  const sortedAlerts = React.useMemo(() => {
    const severityOrder: AlertSeverity[] = ["critical", "high", "medium", "low"]
    return [...alerts]
      .sort((a, b) => {
        const severityDiff = severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)
        if (severityDiff !== 0) return severityDiff

        const timeA = typeof a.timestamp === "string" ? new Date(a.timestamp) : a.timestamp
        const timeB = typeof b.timestamp === "string" ? new Date(b.timestamp) : b.timestamp
        return timeB.getTime() - timeA.getTime()
      })
      .slice(0, maxItems)
  }, [alerts, maxItems])

  const alertCounts = React.useMemo(() => {
    return alerts.reduce(
      (acc, alert) => {
        acc[alert.severity]++
        return acc
      },
      { low: 0, medium: 0, high: 0, critical: 0 }
    )
  }, [alerts])

  if (loading) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: maxItems }).map((_, i) => (
            <AlertSkeleton key={i} />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (alerts.length === 0) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-emerald-50 dark:bg-emerald-950/50 p-4 mb-3">
              <HugeiconsIcon
                icon={CheckmarkCircle01Icon}
                strokeWidth={2}
                className="size-6 text-emerald-500"
              />
            </div>
            <p className="text-sm text-muted-foreground">All caught up!</p>
            <p className="text-xs text-muted-foreground mt-1">No alerts at this time</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-medium">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {showViewAll && (viewAllHref || onViewAll) && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-primary"
              onClick={onViewAll}
              asChild={!!viewAllHref}
            >
              {viewAllHref ? (
                <a href={viewAllHref}>View all</a>
              ) : (
                <span>View all</span>
              )}
            </Button>
          )}
        </div>

        <div className="flex gap-2 mt-2">
          {alertCounts.critical > 0 && (
            <Badge className="bg-red-500 text-white">{alertCounts.critical} Critical</Badge>
          )}
          {alertCounts.high > 0 && (
            <Badge className="bg-orange-500 text-white">{alertCounts.high} High</Badge>
          )}
          {alertCounts.medium > 0 && (
            <Badge className="bg-yellow-500 text-white">{alertCounts.medium} Medium</Badge>
          )}
          {alertCounts.low > 0 && (
            <Badge className="bg-blue-500 text-white">{alertCounts.low} Low</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2" ref={ref}>
        {sortedAlerts.map((alert, index) => (
          <div
            key={alert.id}
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "translateY(0)" : "translateY(10px)",
              transition: `opacity 300ms ${index * 50}ms, transform 300ms ${index * 50}ms`,
            }}
          >
            <AlertItemComponent
              alert={alert}
              onDismiss={onDismiss}
              onAlertClick={onAlertClick}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  )
})

export { AlertsWidget, AlertItemComponent, severityConfig, typeConfig }
export type { AlertsWidgetProps, AlertItem, AlertSeverity, AlertType }
