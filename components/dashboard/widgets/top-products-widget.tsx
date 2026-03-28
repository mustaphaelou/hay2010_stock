"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  ShoppingBag01Icon,
  ShoppingCart01Icon,
  ArrowRight01Icon,
  StarIcon,
} from "@hugeicons/core-free-icons"

interface TopProduct {
  id: string
  name: string
  image?: string
  category: string
  salesCount: number
  revenue: number
  trend: number
  trendDirection: "up" | "down" | "neutral"
  stockLevel: number
  rating?: number
  miniChartData?: number[]
}

interface TopProductsWidgetProps {
  products: TopProduct[]
  title?: string
  description?: string
  maxItems?: number
  loading?: boolean
  onProductClick?: (product: TopProduct) => void
  onViewAll?: () => void
  viewAllHref?: string
  className?: string
}

const ProductMiniChart = React.memo(function ProductMiniChart({
  data,
  trendDirection,
}: {
  data?: number[]
  trendDirection: "up" | "down" | "neutral"
}) {
  if (!data || data.length === 0) return null

  const width = 60
  const height = 24
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width
      const y = height - ((value - min) / range) * height
      return `${x},${y}`
    })
    .join(" ")

  const color =
    trendDirection === "up"
      ? "text-emerald-500"
      : trendDirection === "down"
      ? "text-red-500"
      : "text-muted-foreground"

  return (
    <svg width={width} height={height} className={cn("shrink-0", color)}>
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
})

const ProductAvatar = React.memo(function ProductAvatar({
  image,
  name,
  size = "md",
}: {
  image?: string
  name: string
  size?: "sm" | "md" | "lg"
}) {
  const sizeClasses = {
    sm: "size-8",
    md: "size-10",
    lg: "size-12",
  }

  if (image) {
    return (
      <img
        src={image}
        alt={name}
        className={cn(sizeClasses[size], "rounded-lg object-cover")}
      />
    )
  }

  return (
    <div
      className={cn(
        sizeClasses[size],
        "rounded-lg bg-primary/10 flex items-center justify-center"
      )}
    >
      <HugeiconsIcon
        icon={ShoppingBag01Icon}
        strokeWidth={2}
        className={cn("text-primary", size === "sm" ? "size-4" : "size-5")}
      />
    </div>
  )
})

function ProductSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border">
      <Skeleton className="size-10 rounded-lg shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <div className="flex flex-col items-end gap-1">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  )
}

const TopProductsWidget = React.memo(function TopProductsWidget({
  products,
  title = "Top Products",
  description = "Best selling products this month",
  maxItems = 5,
  loading = false,
  onProductClick,
  onViewAll,
  viewAllHref,
  className,
}: TopProductsWidgetProps) {
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

  const displayProducts = products.slice(0, maxItems)

  if (loading) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: maxItems }).map((_, i) => (
            <ProductSkeleton key={i} />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (products.length === 0) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-4 mb-3">
              <HugeiconsIcon
                icon={ShoppingBag01Icon}
                strokeWidth={2}
                className="size-6 text-muted-foreground"
              />
            </div>
            <p className="text-sm text-muted-foreground">No products to display</p>
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
          {(viewAllHref || onViewAll) && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-primary"
              onClick={onViewAll}
              asChild={!!viewAllHref}
            >
              {viewAllHref ? (
                <a href={viewAllHref}>
                  View all
                  <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4" />
                </a>
              ) : (
                <>
                  View all
                  <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2" ref={ref}>
        {displayProducts.map((product, index) => (
          <div
            key={product.id}
            onClick={() => onProductClick?.(product)}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border transition-all",
              onProductClick && "cursor-pointer hover:bg-muted/50 hover:shadow-sm"
            )}
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "translateY(0)" : "translateY(10px)",
              transition: `opacity 300ms ${index * 50}ms, transform 300ms ${index * 50}ms`,
            }}
            role={onProductClick ? "button" : undefined}
            tabIndex={onProductClick ? 0 : undefined}
            onKeyDown={
              onProductClick
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      onProductClick(product)
                    }
                  }
                : undefined
            }
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <ProductAvatar image={product.image} name={product.name} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{product.name}</span>
                  {product.rating && (
                    <div className="flex items-center gap-0.5">
                      <HugeiconsIcon
                        icon={StarIcon}
                        strokeWidth={2}
                        className="size-3 text-yellow-500"
                      />
                      <span className="text-xs text-muted-foreground">{product.rating}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-xs px-1.5 py-0">
                    {product.category}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <HugeiconsIcon
                      icon={ShoppingCart01Icon}
                      strokeWidth={2}
                      className="size-3"
                    />
                    {product.salesCount.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {product.miniChartData && (
                <ProductMiniChart
                  data={product.miniChartData}
                  trendDirection={product.trendDirection}
                />
              )}
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium">
                  ${product.revenue.toLocaleString()}
                </span>
                <div
                  className={cn(
                    "flex items-center gap-0.5 text-xs",
                    product.trendDirection === "up"
                      ? "text-emerald-500"
                      : product.trendDirection === "down"
                      ? "text-red-500"
                      : "text-muted-foreground"
                  )}
                >
                  <HugeiconsIcon
                    icon={
                      product.trendDirection === "up"
                        ? ArrowUp01Icon
                        : product.trendDirection === "down"
                        ? ArrowDown01Icon
                        : ArrowUp01Icon
                    }
                    strokeWidth={2}
                    className="size-3"
                  />
                  <span>{Math.abs(product.trend).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
})

export { TopProductsWidget, ProductMiniChart, ProductAvatar }
export type { TopProductsWidgetProps, TopProduct }
