"use client"

import * as React from "react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Download02Icon,
  FullScreenIcon,
} from "@hugeicons/core-free-icons"

export type ChartType = "area" | "bar" | "line"
export type TimeRange = "7d" | "30d" | "90d" | "1y" | "all"

interface DataPoint {
  date: string
  [key: string]: string | number
}

interface SeriesConfig {
  key: string
  label: string
  color?: string
}

interface InteractiveChartCardProps {
  title: string
  description?: string
  data: DataPoint[]
  series: SeriesConfig[]
  chartType?: ChartType
  defaultTimeRange?: TimeRange
  enableTimeRangeSelector?: boolean
  enableChartTypeSelector?: boolean
  enableComparison?: boolean
  enableFullScreen?: boolean
  enableDownload?: boolean
  loading?: boolean
  className?: string
  height?: number
  onTimeRangeChange?: (range: TimeRange) => void
  onChartTypeChange?: (type: ChartType) => void
  formatDate?: (date: string) => string
  formatValue?: (value: number) => string
}

const generateChartConfig = (series: SeriesConfig[]): ChartConfig => {
  const config: ChartConfig = {}
  series.forEach((s, index) => {
    config[s.key] = {
      label: s.label,
      color: s.color || `hsl(var(--chart-${(index % 5) + 1}))`,
    }
  })
  return config
}

function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="space-y-4" style={{ height }}>
      <div className="flex justify-between gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="flex-1 w-full" style={{ height: height - 60 }} />
    </div>
  )
}

const chartTypeOptions: { value: ChartType; label: string }[] = [
  { value: "area", label: "Area" },
  { value: "bar", label: "Bar" },
  { value: "line", label: "Line" },
]

export function InteractiveChartCard({
  title,
  description,
  data,
  series,
  chartType: initialChartType = "area",
  defaultTimeRange = "90d",
  enableTimeRangeSelector = true,
  enableChartTypeSelector = true,
  enableFullScreen = false,
  enableDownload = false,
  loading = false,
  className,
  height = 300,
  onTimeRangeChange,
  onChartTypeChange,
  formatDate = (date) => {
    const d = new Date(date)
    return d.toLocaleDateString("fr-FR", { month: "short", day: "numeric" })
  },
  formatValue = (value) => value.toLocaleString("fr-FR"),
}: InteractiveChartCardProps) {
  const [mounted, setMounted] = React.useState(false)
  const [timeRange, setTimeRange] = React.useState<TimeRange>(defaultTimeRange)
  const [chartType, setChartType] = React.useState<ChartType>(initialChartType)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const handleTimeRangeChange = (value: TimeRange) => {
    setTimeRange(value)
    onTimeRangeChange?.(value)
  }

  const handleChartTypeChange = (value: ChartType) => {
    setChartType(value)
    onChartTypeChange?.(value)
  }

  const chartConfig = React.useMemo(() => generateChartConfig(series), [series])

  const filteredData = React.useMemo(() => {
    if (!data.length) return data

    const now = new Date()
    let startDate = new Date(now)

    switch (timeRange) {
      case "7d":
        startDate.setDate(now.getDate() - 7)
        break
      case "30d":
        startDate.setDate(now.getDate() - 30)
        break
      case "90d":
        startDate.setDate(now.getDate() - 90)
        break
      case "1y":
        startDate.setFullYear(now.getFullYear() - 1)
        break
      case "all":
      default:
        return data
    }

    return data.filter((item) => {
      const itemDate = new Date(item.date)
      return itemDate >= startDate && itemDate <= now
    })
  }, [data, timeRange])

  const trend = React.useMemo(() => {
    if (!filteredData.length || filteredData.length < 2) return null

    const firstValue = Number(filteredData[0][series[0]?.key] || 0)
    const lastValue = Number(filteredData[filteredData.length - 1][series[0]?.key] || 0)

    if (firstValue === 0) return null

    const percentChange = ((lastValue - firstValue) / firstValue) * 100
    const direction = percentChange >= 0 ? "up" : "down"

    return {
      value: Math.abs(percentChange).toFixed(1),
      direction,
    }
  }, [filteredData, series])

  if (!mounted || loading) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <ChartSkeleton height={height} />
        </CardContent>
      </Card>
    )
  }

  const renderChart = () => {
    const commonProps = {
      data: filteredData,
      accessibilityLayer: true,
    }

    const renderSeries = () => {
      return series.map((s) => {
        switch (chartType) {
          case "bar":
            return (
              <Bar
                key={s.key}
                dataKey={s.key}
                fill={`var(--color-${s.key})`}
                radius={4}
              />
            )
          case "line":
            return (
              <Line
                key={s.key}
                dataKey={s.key}
                stroke={`var(--color-${s.key})`}
                strokeWidth={2}
                dot={false}
              />
            )
          case "area":
          default:
            return (
              <Area
                key={s.key}
                dataKey={s.key}
                type="natural"
                fill={`var(--color-${s.key})`}
                stroke={`var(--color-${s.key})`}
                fillOpacity={0.4}
                stackId="a"
              />
            )
        }
      })
    }

    const ChartComponent = chartType === "bar" ? BarChart : chartType === "line" ? LineChart : AreaChart

    return (
      <ChartContainer config={chartConfig} className={`h-[${height}px] w-full`} style={{ height }}>
        <ChartComponent {...commonProps}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={`var(--color-${s.key})`} stopOpacity={0.8} />
                <stop offset="95%" stopColor={`var(--color-${s.key})`} stopOpacity={0.1} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={32}
            tickFormatter={formatDate}
            className="text-xs"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={formatValue}
            className="text-xs"
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                labelFormatter={formatDate}
                indicator="dot"
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          {renderSeries()}
        </ChartComponent>
      </ChartContainer>
    )
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <CardAction>
            <div className="flex flex-wrap items-center gap-2">
              {trend && (
                <div
                  className={cn(
                    "flex items-center gap-1 text-sm font-medium",
                    trend.direction === "up" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                  )}
                >
                  <HugeiconsIcon
                    icon={trend.direction === "up" ? ArrowUp01Icon : ArrowDown01Icon}
                    strokeWidth={2}
                    className="size-4"
                  />
                  <span>{trend.value}%</span>
                </div>
              )}
              {enableChartTypeSelector && (
                <div className="hidden sm:flex gap-1" role="group" aria-label="Chart type">
                  {chartTypeOptions.map((option) => (
                    <Button
                      key={option.value}
                      variant={chartType === option.value ? "default" : "outline"}
                      size="xs"
                      onClick={() => handleChartTypeChange(option.value)}
                      aria-pressed={chartType === option.value}
                      aria-label={`${option.label} chart`}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              )}
              {enableTimeRangeSelector && (
                <Select
                  value={timeRange}
                  onValueChange={(value) => handleTimeRangeChange(value as TimeRange)}
                >
                  <SelectTrigger
                    className="w-[100px] rounded-lg sm:ml-auto"
                    aria-label="Select time range"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                    <SelectItem value="1y">Last year</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {enableFullScreen && (
                <Button variant="ghost" size="icon-xs" aria-label="Full screen">
                  <HugeiconsIcon icon={FullScreenIcon} strokeWidth={2} className="size-4" />
                </Button>
              )}
              {enableDownload && (
                <Button variant="ghost" size="icon-xs" aria-label="Download">
                  <HugeiconsIcon icon={Download02Icon} strokeWidth={2} className="size-4" />
                </Button>
              )}
            </div>
          </CardAction>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:px-4 pt-4">
        {renderChart()}
      </CardContent>
    </Card>
  )
}

export type { DataPoint, SeriesConfig, InteractiveChartCardProps }
