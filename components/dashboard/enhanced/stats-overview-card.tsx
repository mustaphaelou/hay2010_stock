"use client"

import * as React from "react"
import { cn, isValidIcon } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { SafeIcon as HugeiconsIcon } from "@/components/ui/safe-icon"
import type { IconSvgElement } from "@hugeicons/react"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import {
  ArrowUp01Icon,
  ArrowDown01Icon,
  MinusSignIcon,
} from "@hugeicons/core-free-icons"

export type StatsOverviewTone = "default" | "success" | "warning" | "danger" | "info"

const TONE_CLASSES: Record<StatsOverviewTone, { border: string; dot: string; fill: string }> = {
  default: { border: "border-l-primary", dot: "bg-primary", fill: "bg-primary" },
  success: { border: "border-l-emerald-500", dot: "bg-emerald-500", fill: "bg-emerald-500" },
  warning: { border: "border-l-amber-500", dot: "bg-amber-500", fill: "bg-amber-500" },
  danger: { border: "border-l-destructive", dot: "bg-destructive", fill: "bg-destructive" },
  info: { border: "border-l-blue-500", dot: "bg-blue-500", fill: "bg-blue-500" },
}

interface TrendData {
  value: number
  direction: "up" | "down" | "neutral"
  label?: string
}

interface StatsOverviewCardProps {
  title: string
  value: string | number
  description?: string
  icon?: IconSvgElement
  iconColor?: string
  trend?: TrendData
  sparklineData?: number[]
  loading?: boolean
  animated?: boolean
  compact?: boolean
  className?: string
  prefix?: string
  suffix?: string
  tone?: StatsOverviewTone
  progress?: number
  onClick?: () => void
  tabIndex?: number
}

function formatNumber(value: number, prefix = "", suffix = ""): string {
  const formatted = value.toLocaleString("fr-MA", { maximumFractionDigits: 0 })
  return `${prefix}${formatted}${suffix}`
}

function AnimatedNumber({
  value,
  duration = 1000,
  prefix = "",
  suffix = ""
}: {
  value: number
  duration?: number
  prefix?: string
  suffix?: string
}) {
  const prefersReducedMotion = useReducedMotion()
  const [displayValue, setDisplayValue] = React.useState(0)
  const startTime = React.useRef<number | null>(null)
  const rafRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayValue(value)
      return
    }

    startTime.current = Date.now()

    const animate = () => {
      const now = Date.now()
      const progress = Math.min((now - startTime.current!) / duration, 1)
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      setDisplayValue(Math.floor(easeOutQuart * value))

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        setDisplayValue(value)
      }
    }

    animate()

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [value, duration, prefersReducedMotion])

  return <>{formatNumber(displayValue, prefix, suffix)}</>
}

function MiniSparkline({
  data,
  className,
}: {
  data: number[]
  className?: string
}) {
  if (!data || data.length < 2) return null

  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100
      const y = 100 - ((value - min) / range) * 100
      return `${x},${y}`
    })
    .join(" ")

  const lastValue = data[data.length - 1]
  const firstValue = data[0]
  const isPositive = lastValue >= firstValue

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={cn("h-10 w-20", className)}
      role="img"
      aria-label={`Mini graphique: ${isPositive ? "hausse" : "baisse"}`}
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(
          "transition-colors duration-300",
          isPositive ? "text-emerald-500" : "text-red-500"
        )}
      />
    </svg>
  )
}

function TrendIndicator({ trend }: { trend: TrendData }) {
  const iconMap = {
    up: ArrowUp01Icon,
    down: ArrowDown01Icon,
    neutral: MinusSignIcon,
  }

  const colorMap = {
    up: "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30",
    down: "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30",
    neutral: "text-muted-foreground bg-muted",
  }

  const Icon = iconMap[trend.direction]

  return (
    <div
      className={cn(
        "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
        colorMap[trend.direction]
      )}
      aria-label={`Trend: ${trend.direction} by ${trend.value}%`}
    >
      <HugeiconsIcon
        icon={Icon}
        strokeWidth={2}
        className="size-3"
      />
      <span>{trend.value > 0 ? `${trend.value}%` : trend.label}</span>
    </div>
  )
}

function InlineProgressBar({ value, tone }: { value: number; tone: StatsOverviewTone }) {
  const pct = Math.max(0, Math.min(100, value))
  const cls = TONE_CLASSES[tone]
  return (
    <div
      data-slot="kpi-progress"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-0.5 w-full overflow-hidden rounded-full bg-muted"
    >
      <div
        data-slot="kpi-progress-fill"
        className={cn("h-full transition-[width] duration-500 ease-out", cls.fill)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function StatsOverviewCard({
  title,
  value,
  description,
  icon,
  iconColor = "text-muted-foreground",
  trend,
  sparklineData,
  loading = false,
  animated = true,
  compact = false,
  className,
  prefix,
  suffix,
  tone = "default",
  progress,
  onClick,
  tabIndex,
}: StatsOverviewCardProps) {
  const numericValue = typeof value === "number"
    ? value
    : parseFloat(value.replace(/[^\d.-]/g, "")) || 0

  const tones = TONE_CLASSES[tone]

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (onClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault()
      onClick()
    }
  }, [onClick])

  if (loading) {
    return (
      <Card className={cn("border border-l-2 bg-card p-4", tones.border, className)}>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-20" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        "border border-l-2 bg-card transition-colors duration-200",
        "hover:border-foreground/30 hover:bg-muted/20",
        tones.border,
        onClick && "cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      tabIndex={tabIndex ?? (onClick ? 0 : undefined)}
      onKeyDown={onClick ? handleKeyDown : undefined}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={cn(
          "flex items-center gap-2 font-medium text-muted-foreground",
          compact ? "text-xs" : "text-sm"
        )}>
          <span
            aria-hidden="true"
            data-slot="kpi-status-dot"
            className={cn("size-1.5 shrink-0 rounded-full", tones.dot)}
          />
          {title}
        </CardTitle>
        {isValidIcon(icon) && !compact && (
          <HugeiconsIcon
            icon={icon}
            strokeWidth={2}
            className={cn("size-4", iconColor)}
          />
        )}
      </CardHeader>

      <CardContent aria-live="polite" className="space-y-2">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1 min-w-0 flex-1">
            <div className={cn("font-bold tracking-tight tabular-nums", compact ? "text-xl" : "text-2xl")}>
              {typeof value === "number" && animated ? (
                <AnimatedNumber
                  value={numericValue}
                  prefix={prefix}
                  suffix={suffix}
                />
              ) : (
                <span>
                  {prefix}
                  {typeof value === "number"
                    ? value.toLocaleString("fr-MA", { maximumFractionDigits: 0 })
                    : value}
                  {suffix}
                </span>
              )}
            </div>

            {description && !compact && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}

            {trend && !compact && <TrendIndicator trend={trend} />}
          </div>

          {sparklineData && !compact && (
            <div className="shrink-0">
              <MiniSparkline data={sparklineData} />
            </div>
          )}
        </div>

        {progress !== undefined && !compact && (
          <InlineProgressBar value={progress} tone={tone} />
        )}
      </CardContent>
    </Card>
  )
}

export type { StatsOverviewCardProps, TrendData }
