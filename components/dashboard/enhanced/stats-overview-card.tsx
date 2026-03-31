"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn, isValidIcon } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { HugeiconsIcon } from "@hugeicons/react"
import type { IconSvgElement } from "@hugeicons/react"
import {
  ArrowUp01Icon,
  ArrowDown01Icon,
  MinusSignIcon,
} from "@hugeicons/core-free-icons"

const statsCardVariants = cva(
  "relative overflow-hidden transition-all duration-300 group",
  {
    variants: {
      variant: {
        default: "border-border/50 hover:border-primary/30 hover:shadow-lg",
        success: "border-emerald-500/30 bg-gradient-to-br from-emerald-50/80 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20 hover:shadow-emerald-500/10",
        warning: "border-amber-500/30 bg-gradient-to-br from-amber-50/80 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-900/20 hover:shadow-amber-500/10",
        danger: "border-red-500/30 bg-gradient-to-br from-red-50/80 to-red-100/50 dark:from-red-950/40 dark:to-red-900/20 hover:shadow-red-500/10",
        info: "border-blue-500/30 bg-gradient-to-br from-blue-50/80 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/20 hover:shadow-blue-500/10",
      },
      size: {
        default: "p-4",
        sm: "p-3",
        lg: "p-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const glowVariants = cva(
  "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-br from-primary/5 to-transparent",
        success: "bg-gradient-to-br from-emerald-500/10 to-transparent",
        warning: "bg-gradient-to-br from-amber-500/10 to-transparent",
        danger: "bg-gradient-to-br from-red-500/10 to-transparent",
        info: "bg-gradient-to-br from-blue-500/10 to-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface TrendData {
  value: number
  direction: "up" | "down" | "neutral"
  label?: string
}

interface StatsOverviewCardProps extends VariantProps<typeof statsCardVariants> {
  title: string
  value: string | number
  description?: string
  icon?: IconSvgElement
  iconColor?: string
  trend?: TrendData
  sparklineData?: number[]
  loading?: boolean
  animated?: boolean
  className?: string
  prefix?: string
  suffix?: string
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
  const [displayValue, setDisplayValue] = React.useState(0)
  const startTime = React.useRef<number | null>(null)
  const rafRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    if (startTime.current === null) {
      startTime.current = Date.now()
    }

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
  }, [value, duration])

  return <>{prefix}{displayValue.toLocaleString()}{suffix}</>
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

export function StatsOverviewCard({
  title,
  value,
  description,
  icon,
  iconColor = "text-primary",
  trend,
  sparklineData,
  variant,
  size,
  loading = false,
  animated = true,
  className,
  prefix,
  suffix,
}: StatsOverviewCardProps) {
  const numericValue = typeof value === "number" 
    ? value 
    : parseFloat(value.replace(/[^\d.-]/g, "")) || 0

  if (loading) {
    return (
      <Card className={cn(statsCardVariants({ variant, size }), className)}>
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
        statsCardVariants({ variant, size }),
        "hover:-translate-y-0.5",
        className
      )}
    >
      <div className={cn(glowVariants({ variant }))} />
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
{isValidIcon(icon) && (
      <div
        className={cn(
          "p-2.5 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-all duration-300",
          "group-hover:scale-110 group-hover:shadow-lg"
        )}
      >
        <HugeiconsIcon
          icon={icon}
          strokeWidth={2}
          className={cn("size-5", iconColor)}
        />
      </div>
    )}
      </CardHeader>

      <CardContent className="relative">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="text-2xl font-bold tracking-tight tabular-nums">
              {typeof value === "number" && animated ? (
                <AnimatedNumber 
                  value={numericValue} 
                  prefix={prefix}
                  suffix={suffix}
                />
              ) : (
                <span>
                  {prefix}
                  {typeof value === "number" ? value.toLocaleString() : value}
                  {suffix}
                </span>
              )}
            </div>
            
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            
            {trend && <TrendIndicator trend={trend} />}
          </div>
          
          {sparklineData && (
            <div className="shrink-0">
              <MiniSparkline data={sparklineData} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export type { StatsOverviewCardProps, TrendData }
