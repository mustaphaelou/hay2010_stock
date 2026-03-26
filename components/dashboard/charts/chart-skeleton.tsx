"use client"

import * as React from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface ChartSkeletonProps {
    title?: string
    description?: string
    height?: number | string
    showLegend?: boolean
    variant?: "bar" | "pie" | "line" | "area"
    className?: string
}

export function ChartSkeleton({
    title,
    description,
    height = 300,
    showLegend = true,
    variant = "bar",
    className,
}: ChartSkeletonProps) {
    const heightValue = typeof height === "number" ? `${height}px` : height

    // Generate stable random heights using useMemo to avoid hydration mismatches
    const barHeights = React.useMemo(
        () => Array.from({ length: 7 }, (_, i) => 30 + ((i * 13) % 60)),
        []
    )

    const linePoints = React.useMemo(
        () =>
            Array.from({ length: 12 }, (_, i) => {
                const x = (i / 11) * 100
                const y = 20 + ((i * 17) % 60)
                return `L ${x}% ${y}%`
            }).join(" "),
        []
    )

    const areaHeights = React.useMemo(
        () => Array.from({ length: 12 }, (_, i) => 20 + ((i * 11) % 70)),
        []
    )

    return (
        <Card className={cn("overflow-hidden", className)}>
            {(title || description) && (
                <CardHeader className="pb-2">
                    {title && <Skeleton className="h-5 w-32" />}
                    {description && <Skeleton className="h-4 w-48 mt-1" />}
                </CardHeader>
            )}
            <CardContent>
                <div
                    className="relative w-full"
                    style={{ height: heightValue }}
                >
                    {variant === "bar" && (
                        <div className="flex items-end justify-around h-full gap-2 pt-4">
                            {barHeights.map((h, i) => (
                                <Skeleton
                                    key={i}
                                    className="w-full max-w-[40px] rounded-t"
                                    style={{
                                        height: `${h}%`,
                                        animationDelay: `${i * 100}ms`,
                                    }}
                                />
                            ))}
                        </div>
                    )}

                    {variant === "pie" && (
                        <div className="flex items-center justify-center h-full">
                            <div className="relative">
                                <Skeleton className="w-40 h-40 rounded-full" />
                                <div className="absolute inset-4 bg-card rounded-full" />
                            </div>
                        </div>
                    )}

                    {variant === "line" && (
                        <div className="relative h-full">
                            <svg className="w-full h-full" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="skeleton-gradient" x1="0%" y1="0" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor="hsl(var(--muted))" stopOpacity="0.5" />
                                        <stop offset="100%" stopColor="hsl(var(--muted))" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                <path
                                    d={`M 0 ${heightValue} ${linePoints} L 100% ${heightValue} Z`}
                                    fill="url(#skeleton-gradient)"
                                    className="animate-pulse"
                                />
                            </svg>
                        </div>
                    )}

                    {variant === "area" && (
                        <div className="flex items-end h-full gap-1">
                            {areaHeights.map((h, i) => (
                                <Skeleton
                                    key={i}
                                    className="flex-1 rounded-t"
                                    style={{
                                        height: `${h}%`,
                                        animationDelay: `${i * 50}ms`,
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {showLegend && (
                    <div className="flex justify-center gap-4 mt-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <Skeleton className="w-3 h-3 rounded-full" />
                                <Skeleton className="h-3 w-16" />
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export function ChartEmptyState({
    title,
    description,
    icon,
    className,
}: {
    title: string
    description?: string
    icon?: React.ReactNode
    className?: string
}) {
    return (
        <Card className={cn("flex items-center justify-center", className)}>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                {icon && <div className="mb-4 opacity-30">{icon}</div>}
                <p className="text-muted-foreground font-medium">{title}</p>
                {description && (
                    <p className="text-sm text-muted-foreground/70 mt-1">{description}</p>
                )}
            </CardContent>
        </Card>
    )
}

export type { ChartSkeletonProps }
