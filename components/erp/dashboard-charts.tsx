"use client"

import * as React from "react"
import { Bar, BarChart, Pie, PieChart, Cell, XAxis, YAxis, CartesianGrid } from "recharts"
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
} from "@/components/ui/chart"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

interface MonthlyData {
    month: string
    ventes: number
    achats: number
}

interface PaymentStatusData {
    name: string
    value: number
    fill: string
}

interface DashboardChartsProps {
    monthlyData: MonthlyData[]
    paymentData: PaymentStatusData[]
}

const monthlyChartConfig = {
    ventes: {
        label: "Ventes",
        color: "hsl(var(--chart-1))",
    },
    achats: {
        label: "Achats",
        color: "hsl(var(--chart-2))",
    },
} satisfies ChartConfig

const paymentChartConfig = {
    value: {
        label: "Documents",
    },
    regle: {
        label: "Réglé",
        color: "hsl(142, 76%, 36%)",
    },
    partiel: {
        label: "Partiel",
        color: "hsl(38, 92%, 50%)",
    },
    encours: {
        label: "En cours",
        color: "hsl(215, 20%, 65%)",
    },
} satisfies ChartConfig

export function SalesVsPurchasesChart({ data }: { data: MonthlyData[] }) {
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted || !data || data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Ventes vs Achats</CardTitle>
                    <CardDescription>Comparaison mensuelle</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[200px]">
                    <p className="text-muted-foreground text-sm">Aucune donnée disponible</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg">Ventes vs Achats</CardTitle>
                <CardDescription>Comparaison mensuelle (derniers mois)</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={monthlyChartConfig} className="h-[200px] w-full">
                    <BarChart data={data} accessibilityLayer>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                            dataKey="month"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent indicator="dashed" />}
                        />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Bar dataKey="ventes" fill="var(--color-ventes)" radius={4} />
                        <Bar dataKey="achats" fill="var(--color-achats)" radius={4} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}

export function PaymentStatusChart({ data }: { data: PaymentStatusData[] }) {
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted || !data || data.length === 0 || data.every(d => d.value === 0)) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Statut Paiements</CardTitle>
                    <CardDescription>Répartition des factures</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[200px]">
                    <p className="text-muted-foreground text-sm">Aucune donnée disponible</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg">Statut Paiements</CardTitle>
                <CardDescription>Répartition des factures de vente</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={paymentChartConfig} className="h-[200px] w-full">
                    <PieChart accessibilityLayer>
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel />}
                        />
                        <Pie
                            data={data}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            paddingAngle={2}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Pie>
                        <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                    </PieChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}

export function DashboardCharts({ monthlyData, paymentData }: DashboardChartsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2">
            <SalesVsPurchasesChart data={monthlyData} />
            <PaymentStatusChart data={paymentData} />
        </div>
    )
}
