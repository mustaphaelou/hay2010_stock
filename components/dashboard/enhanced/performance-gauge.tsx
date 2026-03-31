"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface Threshold {
  value: number
  label: string
  color: string
}

interface PerformanceGaugeProps {
  value: number
  max?: number
  min?: number
  title: string
  description?: string
  unit?: string
  thresholds?: Threshold[]
  size?: "sm" | "md" | "lg"
  showValue?: boolean
  showPercentage?: boolean
  animated?: boolean
  loading?: boolean
  className?: string
}

const sizeConfig = {
  sm: {
    radius: 60,
    strokeWidth: 8,
    fontSize: "text-xl",
    labelSize: "text-xs",
    containerSize: "size-32",
  },
  md: {
    radius: 80,
    strokeWidth: 12,
    fontSize: "text-3xl",
    labelSize: "text-sm",
    containerSize: "size-44",
  },
  lg: {
    radius: 100,
    strokeWidth: 16,
    fontSize: "text-4xl",
    labelSize: "text-base",
    containerSize: "size-56",
  },
}

const defaultThresholds: Threshold[] = [
  { value: 25, label: "Low", color: "#22c55e" },
  { value: 50, label: "Medium", color: "#eab308" },
  { value: 75, label: "High", color: "#f97316" },
  { value: 100, label: "Critical", color: "#ef4444" },
]

function getColorForValue(value: number, thresholds: Threshold[]): string {
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (value >= thresholds[i].value) {
      return thresholds[i].color
    }
  }
  return thresholds[0]?.color || "#22c55e"
}

function GaugeSkeleton({ size }: { size: "sm" | "md" | "lg" }) {
  const config = sizeConfig[size]
  return (
    <div className="flex flex-col items-center gap-3">
      <div className={cn(config.containerSize, "relative")}>
        <Skeleton className="absolute inset-0 rounded-full" />
      </div>
      <Skeleton className="h-4 w-20" />
    </div>
  )
}

export function PerformanceGauge({
  value,
  max = 100,
  min = 0,
  title,
  description,
  unit = "",
  thresholds = defaultThresholds,
  size = "md",
  showValue = true,
  showPercentage = true,
  animated = true,
  loading = false,
  className,
}: PerformanceGaugeProps) {
  const [animatedValue, setAnimatedValue] = React.useState(0)
  const config = sizeConfig[size]

  React.useEffect(() => {
    if (animated) {
      const duration = 1000
      const startTime = Date.now()
      const startValue = animatedValue
      
      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        const easeOutQuart = 1 - Math.pow(1 - progress, 4)
        const currentValue = startValue + (value - startValue) * easeOutQuart
        
        setAnimatedValue(currentValue)
        
        if (progress < 1) {
          requestAnimationFrame(animate)
        }
      }
      
      animate()
    } else {
      setAnimatedValue(value)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, animated])

  if (loading) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="flex justify-center pb-4">
          <GaugeSkeleton size={size} />
        </CardContent>
      </Card>
    )
  }

  const normalizedValue = Math.max(0, Math.min(100, ((animatedValue - min) / (max - min)) * 100))
  const safeRadius = Math.max(10, config.radius)
  const safeStrokeWidth = Math.max(1, config.strokeWidth)
  const circumference = 2 * Math.PI * safeRadius
  const strokeDashoffset = circumference - (normalizedValue / 100) * circumference
  const color = getColorForValue(normalizedValue, thresholds)
  const currentThreshold = [...thresholds].reverse().find(t => normalizedValue >= t.value)

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col items-center pb-4">
        <div className={cn(config.containerSize, "relative")}>
          <svg
            viewBox={`0 0 ${safeRadius * 2 + safeStrokeWidth} ${safeRadius * 2 + safeStrokeWidth}`}
            className="transform -rotate-90 w-full h-full"
            role="img"
            aria-label={`${title}: ${Math.round(normalizedValue)}%`}
          >
            <circle
              cx={safeRadius + safeStrokeWidth / 2}
              cy={safeRadius + safeStrokeWidth / 2}
              r={safeRadius}
              fill="none"
              stroke="currentColor"
              strokeWidth={safeStrokeWidth}
              className="text-muted/30"
            />
            <circle
              cx={safeRadius + safeStrokeWidth / 2}
              cy={safeRadius + safeStrokeWidth / 2}
              r={safeRadius}
              fill="none"
              stroke={color}
              strokeWidth={safeStrokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
          
          {showValue && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn("font-bold", config.fontSize)}>
                {showPercentage 
                  ? `${Math.round(normalizedValue)}%`
                  : `${Math.round(animatedValue)}${unit}`
                }
              </span>
              {currentThreshold && (
                <span 
                  className={cn("font-medium mt-1", config.labelSize)}
                  style={{ color }}
                >
                  {currentThreshold.label}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Threshold Legend */}
        {thresholds.length > 1 && (
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {thresholds.map((threshold, index) => (
              <div
                key={index}
                className="flex items-center gap-1"
              >
                <div
                  className="size-2 rounded-full"
                  style={{ backgroundColor: threshold.color }}
                />
                <span className={cn("text-muted-foreground", config.labelSize)}>
                  {threshold.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export type { PerformanceGaugeProps, Threshold }
