/* eslint-disable @next/next/no-img-element */
import * as React from "react"
import { cn, formatQuantity } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { SafeIcon as HugeiconsIcon } from "@/components/ui/safe-icon"
import { ShoppingBag01Icon } from "@hugeicons/core-free-icons"

type StockStatus = "rupture" | "bas" | "en-stock"

interface TopProduct {
  id: string
  name: string
  image?: string
  category: string
  salesCount: number
  revenue: number
  stockLevel: number
  /**
   * Optional legacy fields kept for backward compatibility with the old
   * e-commerce-flavored render. The A1r1 panel no longer displays them.
   */
  rating?: number
  trend?: number
  trendDirection?: "up" | "down" | "neutral"
  miniChartData?: number[]
}

interface TopProductsWidgetProps {
  products: TopProduct[]
  title?: string
  description?: string
  maxItems?: number
  loading?: boolean
  onProductClick?: (product: TopProduct) => void
  className?: string
  /** Stock level at or below which a product is considered "Bas" (low). */
  lowStockThreshold?: number
}

const STATUS_LABEL: Record<StockStatus, string> = {
  rupture: "Rupture",
  bas: "Bas",
  "en-stock": "En stock",
}

const STATUS_DOT: Record<StockStatus, string> = {
  rupture: "bg-destructive",
  bas: "bg-amber-500",
  "en-stock": "bg-emerald-500",
}

const STATUS_PILL: Record<StockStatus, string> = {
  rupture:
    "bg-destructive/10 text-destructive border-destructive/20 dark:bg-destructive/20 dark:border-destructive/30",
  bas: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25",
  "en-stock":
    "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/25",
}

function getStockStatus(stockLevel: number, lowThreshold: number): StockStatus {
  if (stockLevel <= 0) return "rupture"
  if (stockLevel <= lowThreshold) return "bas"
  return "en-stock"
}

const madFormatter = new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 })

function formatMadRevenue(value: number): string {
  return `${madFormatter.format(value)} MAD`
}

const ProductAvatar = React.memo(function ProductAvatar({
  image,
  name,
}: {
  image?: string
  name: string
}) {
  if (image) {
    return (
      <img
        src={image}
        alt={name}
        className="size-10 rounded-lg object-cover shrink-0"
      />
    )
  }

  return (
    <div
      className={cn(
        "size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0",
      )}
    >
      <HugeiconsIcon
        icon={ShoppingBag01Icon}
        strokeWidth={2}
        className="size-5 text-primary"
      />
    </div>
  )
})

function ProductRow({
  product,
  lowStockThreshold,
  onClick,
}: {
  product: TopProduct
  lowStockThreshold: number
  onClick?: (product: TopProduct) => void
}) {
  const status = getStockStatus(product.stockLevel, lowStockThreshold)
  const statusLabel = STATUS_LABEL[status]
  const revenue = formatMadRevenue(product.revenue)
  const sales = formatQuantity(product.salesCount)
  const stock = formatQuantity(product.stockLevel)

  const handleClick = () => onClick?.(product)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onClick?.(product)
    }
  }

  return (
    <div
      data-testid="top-product-row"
      data-stock-status={status}
      onClick={onClick ? handleClick : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        "flex items-center gap-3 px-3 py-2 border-b border-border/50 last:border-b-0",
        onClick && "cursor-pointer hover:bg-muted/30 transition-colors",
      )}
    >
      <ProductAvatar image={product.image} name={product.name} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{product.name}</div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <span className="truncate">{product.category}</span>
          <span aria-hidden="true">·</span>
          <span
            data-slot="top-product-sales-count"
            className="tabular-nums shrink-0"
          >
            {sales} vendus
          </span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div
          data-slot="top-product-revenue"
          className="text-sm font-medium tabular-nums"
        >
          {revenue}
        </div>
        <div
          data-slot="top-product-stock-level"
          className="text-xs text-muted-foreground tabular-nums"
        >
          {stock} en stock
        </div>
      </div>
      <span
        data-slot="top-product-status-pill"
        data-status={status}
        className={cn(
          "shrink-0 inline-flex items-center gap-1.5 text-xs font-medium rounded-full border px-2 py-0.5",
          STATUS_PILL[status],
        )}
      >
        <span
          aria-hidden="true"
          className={cn("size-1.5 rounded-full", STATUS_DOT[status])}
        />
        {statusLabel}
      </span>
    </div>
  )
}

function ProductSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2 border-b border-border/50 last:border-b-0">
      <Skeleton className="size-10 rounded-lg shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <Skeleton className="h-3.5 w-16" />
        <Skeleton className="h-3 w-12" />
      </div>
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
  )
}

const TopProductsWidget = React.memo(function TopProductsWidget({
  products,
  title = "Top produits",
  description = "Produits les plus vendus",
  maxItems = 5,
  loading = false,
  onProductClick,
  className,
  lowStockThreshold = 5,
}: TopProductsWidgetProps) {
  const displayProducts = products.slice(0, maxItems)

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div data-slot="top-products-skeleton">
            {Array.from({ length: maxItems }).map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div
            data-slot="top-products-empty"
            className="flex flex-col items-center justify-center py-8 text-center"
          >
            <div className="rounded-full bg-muted p-4 mb-3">
              <HugeiconsIcon
                icon={ShoppingBag01Icon}
                strokeWidth={2}
                className="size-6 text-muted-foreground"
              />
            </div>
            <p className="text-sm text-muted-foreground">Aucun produit à afficher</p>
            <p className="text-xs text-muted-foreground mt-1">
              Les produits les plus vendus apparaîtront ici.
            </p>
          </div>
        ) : (
          <div data-slot="top-products-list">
            {displayProducts.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                lowStockThreshold={lowStockThreshold}
                onClick={onProductClick}
              />
            ))}
            <div className="px-3 pt-1 pb-2">
              <a
                href="/sales?filter=top"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
              >
                Voir tout
                <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
})

export { TopProductsWidget, ProductAvatar }
export type { TopProductsWidgetProps, TopProduct }
