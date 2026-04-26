"use client"

import * as React from "react"
import { useMemo, memo } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Legend } from "recharts"
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegendContent,
} from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartSkeleton, ChartEmptyState } from "./chart-skeleton"
import { SafeIcon as HugeiconsIcon } from "@/components/ui/safe-icon"
import { Analytics01Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

interface MonthlyData {
    month: string
    sales: number
    purchases: number
}

interface SalesPurchasesChartProps {
    data: MonthlyData[]
    loading?: boolean
    title?: string
    description?: string
    height?: number
    showComparison?: boolean
    className?: string
    onBarClick?: (data: MonthlyData, type: "sales" | "purchases") => void
}

const chartConfig = {
    sales: {
        label: "Ventes",
        color: "hsl(var(--chart-1))",
    },
    purchases: {
        label: "Achats",
        color: "hsl(var(--chart-2))",
    },
} satisfies ChartConfig

export const SalesPurchasesChart = memo(function SalesPurchasesChart({
    data,
    loading = false,
    title = "Performance Commerciale",
    description = "Comparatif Ventes vs Achats (TTC) par mois",
    height = 400,
    showComparison = true,
    className,
    onBarClick,
}: SalesPurchasesChartProps) {
    const [mounted, setMounted] = React.useState(false)
    const [activeBar, setActiveBar] = React.useState<string | null>(null)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted || loading) {
        return (
            <ChartSkeleton
                title={title}
                description={description}
                height={height}
                variant="bar"
                className={className}
            />
        )
    }

    if (!data || data.length === 0) {
        return (
            <ChartEmptyState
                title="Aucune donnée disponible"
                description="Les données de ventes et achats apparaîtront ici"
                icon={<HugeiconsIcon icon={Analytics01Icon} className="size-12" />}
                className={cn("h-[400px]", className)}
            />
        )
    }

    // Calculate totals and trends
    const totalSales = useMemo(() => data.reduce((acc, d) => acc + d.sales, 0), [data])
    const totalPurchases = useMemo(() => data.reduce((acc, d) => acc + d.purchases, 0), [data])
    const margin = useMemo(() => totalSales - totalPurchases, [totalSales, totalPurchases])
    const marginPercent = useMemo(() => totalSales > 0 ? (margin / totalSales) * 100 : 0, [totalSales, margin])

    // Format month for display
const formatMonth = (monthStr: string) => {
if (!monthStr || typeof monthStr !== 'string') return ''
const [year, month] = monthStr.split("-")
if (!year || !month) return monthStr
return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("fr-FR", {
month: "short",
})
}

    return (
        <Card className={cn("overflow-hidden", className)}>
            <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <HugeiconsIcon icon={Analytics01Icon} className="size-5 text-primary" />
                            <span className="gradient-text">{title}</span>
                        </CardTitle>
                        <CardDescription>{description}</CardDescription>
                    </div>
                    {showComparison && (
                        <div className="text-right hidden sm:block">
                            <div className="text-sm text-muted-foreground">Marge</div>
                            <div
                                className={cn(
                                    "text-lg font-bold",
                                    margin >= 0 ? "text-emerald-600" : "text-red-600"
                                )}
                            >
                                {margin >= 0 ? "+" : ""}
                                {marginPercent.toFixed(1)}%
                            </div>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="pt-4">
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <BarChart
                        data={data}
                        accessibilityLayer
                        onMouseMove={(e) => {
                            if (e?.activeLabel) {
                                setActiveBar(e.activeLabel)
                            }
                        }}
                        onMouseLeave={() => setActiveBar(null)}
                    >
                        <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                            dataKey="month"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            tickFormatter={formatMonth}
                            className="text-xs"
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                            className="text-xs"
                        />
                        <ChartTooltip
                            cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                            content={<ChartTooltipContent indicator="dashed" />}
                        />
                        <Legend content={<ChartLegendContent />} />
                        <Bar
                            dataKey="sales"
                            fill="var(--color-sales)"
                            radius={[4, 4, 0, 0]}
                            className={cn(
                                "transition-opacity cursor-pointer",
                                activeBar && activeBar !== "sales" && "opacity-50"
                            )}
                            onClick={(data) => onBarClick?.(data.payload, "sales")}
                        />
                        <Bar
                            dataKey="purchases"
                            fill="var(--color-purchases)"
                            radius={[4, 4, 0, 0]}
                            className={cn(
                                "transition-opacity cursor-pointer",
                                activeBar && activeBar !== "purchases" && "opacity-50"
                            )}
                            onClick={(data) => onBarClick?.(data.payload, "purchases")}
                        />
                    </BarChart>
                </ChartContainer>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                    <div className="text-center">
                        <div className="text-sm text-muted-foreground">Total Ventes</div>
                        <div className="text-xl font-bold text-[hsl(var(--chart-1))]">
                            {new Intl.NumberFormat("fr-MA", {
                                style: "currency",
                                currency: "MAD",
                                notation: "compact",
                            }).format(totalSales)}
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-sm text-muted-foreground">Total Achats</div>
                        <div className="text-xl font-bold text-[hsl(var(--chart-2))]">
                            {new Intl.NumberFormat("fr-MA", {
                                style: "currency",
                                currency: "MAD",
                                notation: "compact",
                            }).format(totalPurchases)}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
});

export type { SalesPurchasesChartProps, MonthlyData };

