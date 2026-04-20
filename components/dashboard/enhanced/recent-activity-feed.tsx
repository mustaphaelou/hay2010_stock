"use client"

import * as React from "react"
import { cn, isValidIcon } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { SafeIcon as HugeiconsIcon } from "@/components/ui/safe-icon"
import type { IconSvgElement } from "@hugeicons/react"
import {
  Clock01Icon,
  PackageIcon,
} from "@hugeicons/core-free-icons"

interface ActivityItem {
  id: string
  title: string
  description?: string
  timestamp: string | Date
  status?: "success" | "warning" | "error" | "info" | "default"
  icon?: IconSvgElement
  href?: string
  onClick?: () => void
}

interface RecentActivityFeedProps {
  items: ActivityItem[]
  title?: string
  maxItems?: number
  loading?: boolean
  emptyMessage?: string
  emptyIcon?: IconSvgElement
  showViewAll?: boolean
  viewAllHref?: string
  onViewAll?: () => void
  className?: string
}

const statusVariants = {
  success: "success" as const,
  warning: "warning" as const,
  error: "destructive" as const,
  info: "info" as const,
  default: "outline" as const,
}

function ActivitySkeleton() {
  return (
    <div className="flex items-start gap-3 p-3">
      <Skeleton className="size-10 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}

function EmptyState({ 
  message, 
  icon 
}: { 
  message: string
  icon?: IconSvgElement 
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="rounded-full bg-muted p-4 mb-3">
        <HugeiconsIcon
          icon={icon || PackageIcon}
          strokeWidth={2}
          className="size-6 text-muted-foreground"
        />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

function formatTimestamp(timestamp: string | Date): string {
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return "À l'instant"
  if (diffMins < 60) return `Il y a ${diffMins} min`
  if (diffHours < 24) return `Il y a ${diffHours}h`
  if (diffDays < 7) return `Il y a ${diffDays}j`

  return date.toLocaleDateString("fr-FR", {
    month: "short",
    day: "numeric",
  })
}

export function RecentActivityFeed({
  items,
  title = "Activité récente",
  maxItems = 5,
  loading = false,
  emptyMessage = "Aucune activité récente",
  emptyIcon,
  showViewAll = false,
  viewAllHref,
  onViewAll,
  className,
}: RecentActivityFeedProps) {
  const displayItems = items.slice(0, maxItems)

  if (loading) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {Array.from({ length: maxItems }).map((_, i) => (
            <ActivitySkeleton key={i} />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (items.length === 0) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState message={emptyMessage} icon={emptyIcon} />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          {showViewAll && (
            <a
              href={viewAllHref}
              onClick={onViewAll}
        className="text-sm text-primary hover:underline underline-offset-4"
        role="button"
        aria-label="Voir toute l'activité"
      >
        Voir tout
            </a>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <ul className="space-y-1" role="list" aria-label="Activity items">
          {displayItems.map((item, index) => (
            <li
              key={item.id}
              style={{ "--index": index } as React.CSSProperties}
              className="animate-fade-in-up"
            >
              {item.href || item.onClick ? (
                <a
                  href={item.href}
                  onClick={(e) => {
                    if (item.onClick) {
                      e.preventDefault()
                      item.onClick()
                    }
                  }}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg transition-colors",
                    "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2",
                    "focus-visible:ring-primary focus-visible:ring-offset-2"
                  )}
                  aria-label={`${item.title} - ${formatTimestamp(item.timestamp)}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {item.title}
                      </span>
                      {item.status && item.status !== "default" && (
                        <Badge
                          variant={statusVariants[item.status]}
                          className="shrink-0"
                        >
                          {item.status}
                        </Badge>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {item.description}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-1">
                      <HugeiconsIcon
                        icon={Clock01Icon}
                        strokeWidth={2}
                        className="size-3 text-muted-foreground"
                      />
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(item.timestamp)}
                      </span>
</div>
      </div>
      {isValidIcon(item.icon) && (
        <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <HugeiconsIcon
            icon={item.icon}
            strokeWidth={2}
            className="size-5 text-primary"
          />
        </div>
      )}
    </a>
  ) : (
    <div className="flex items-start gap-3 p-3 rounded-lg">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">
            {item.title}
          </span>
          {item.status && item.status !== "default" && (
            <Badge
              variant={statusVariants[item.status]}
              className="shrink-0"
            >
              {item.status}
            </Badge>
          )}
        </div>
        {item.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {item.description}
          </p>
        )}
        <div className="flex items-center gap-1 mt-1">
          <HugeiconsIcon
            icon={Clock01Icon}
            strokeWidth={2}
            className="size-3 text-muted-foreground"
          />
<span className="text-xs text-muted-foreground">
        {formatTimestamp(item.timestamp)}
        </span>
        </div>
        </div>
        {isValidIcon(item.icon) && (
        <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <HugeiconsIcon
        icon={item.icon}
        strokeWidth={2}
        className="size-5 text-primary"
        />
        </div>
        )}
        </div>
        )}
        </li>
        ))}
        </ul>
        </CardContent>
        </Card>
        )
        }

        export type { RecentActivityFeedProps, ActivityItem }
