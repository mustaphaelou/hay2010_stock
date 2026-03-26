"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { HugeiconsIcon } from "@hugeicons/react"
import type { IconSvgElement } from "@hugeicons/react"
import { cn } from "@/lib/utils"

const kpiCardVariants = cva(
    "relative overflow-hidden transition-all duration-300 group",
    {
        variants: {
            variant: {
                default: "border-border/50 hover:border-primary/30",
                success: "border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20",
                warning: "border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20",
                danger: "border-red-500/30 bg-red-50/50 dark:bg-red-950/20",
                info: "border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20",
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

interface TrendData {
    value: number
    label: string
    direction: "up" | "down" | "neutral"
}

interface KPICardProps extends VariantProps<typeof kpiCardVariants> {
    title: string
    value: string | number
    description?: string
    icon?: IconSvgElement
    iconColor?: string
    trend?: TrendData
    loading?: boolean
    animated?: boolean
    sparklineData?: number[]
    className?: string
}

function AnimatedNumber({ value, duration = 1000 }: { value: number; duration?: number }) {
    const [displayValue, setDisplayValue] = React.useState(0)
    const startTime = React.useRef(Date.now())

    React.useEffect(() => {
        const animate = () => {
            const now = Date.now()
            const progress = Math.min((now - startTime.current) / duration, 1)
            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4)
            setDisplayValue(Math.floor(easeOutQuart * value))

            if (progress < 1) {
                requestAnimationFrame(animate)
            } else {
                setDisplayValue(value)
            }
        }
        animate()
    }, [value, duration])

    return <>{displayValue.toLocaleString()}</>
}

function MiniSparkline({ data, className }: { data: number[]; className?: string }) {
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

    return (
        <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className={cn("h-8 w-16", className)}
        >
            <polyline
                points={points}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
            />
        </svg>
    )
}

export function KPICard({
    title,
    value,
    description,
    icon,
    iconColor = "text-primary",
    trend,
    variant,
    size,
    loading = false,
    animated = true,
    sparklineData,
    className,
}: KPICardProps) {
    const numericValue = typeof value === "number" ? value : parseFloat(value.replace(/[^\d.-]/g, "")) || 0

    return (
        <Card
            className={cn(
                kpiCardVariants({ variant, size }),
                "hover:shadow-lg hover:-translate-y-0.5",
                className
            )}
        >
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-5">
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br from-primary to-transparent blur-2xl" />
            </div>

            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                {icon && (
                    <div
                        className={cn(
                            "p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors",
                            "animate-pulse-once"
                        )}
                    >
                        <HugeiconsIcon
                            icon={icon}
                            strokeWidth={2}
                            className={cn("size-4", iconColor)}
                        />
                    </div>
                )}
            </CardHeader>

            <CardContent className="relative">
                {loading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-20" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                ) : (
                    <>
                        <div className="flex items-end justify-between">
                            <div className="text-2xl font-bold tracking-tight">
                                {typeof value === "number" && animated ? (
                                    <AnimatedNumber value={numericValue} />
                                ) : (
                                    value
                                )}
                            </div>
                            {sparklineData && <MiniSparkline data={sparklineData} />}
                        </div>

                        {(description || trend) && (
                            <div className="mt-1 flex items-center gap-2">
                                {trend && (
                                    <span
                                        className={cn(
                                            "text-xs font-medium flex items-center gap-0.5",
                                            trend.direction === "up" && "text-emerald-600 dark:text-emerald-400",
                                            trend.direction === "down" && "text-red-600 dark:text-red-400",
                                            trend.direction === "neutral" && "text-muted-foreground"
                                        )}
                                    >
                                        {trend.direction === "up" && "↑"}
                                        {trend.direction === "down" && "↓"}
                                        {trend.value > 0 && `${trend.value > 0 ? "+" : ""}${trend.value}%`}
                                    </span>
                                )}
                                {description && (
                                    <p className="text-xs text-muted-foreground">{description}</p>
                                )}
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    )
}

export type { KPICardProps, TrendData }
