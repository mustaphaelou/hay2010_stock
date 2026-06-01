import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import type { DashboardLowStockItem } from "@/lib/types"

interface LowStockListProps {
  items: DashboardLowStockItem[]
  maxItems?: number
  title?: string
  description?: string
  className?: string
}

const STATUS_BORDER: Record<DashboardLowStockItem["status"], string> = {
  rupture: "bg-destructive",
  bas: "bg-amber-500",
}

const STATUS_LABEL: Record<DashboardLowStockItem["status"], string> = {
  rupture: "Rupture",
  bas: "Bas",
}

function LowStockRow({ item }: { item: DashboardLowStockItem }) {
  const borderClass = STATUS_BORDER[item.status] ?? "bg-border"
  const statusLabel = STATUS_LABEL[item.status] ?? item.status

  return (
    <div
      data-testid="low-stock-row"
      data-status={item.status}
      className="relative flex items-center gap-3 px-3 py-2"
    >
      <span
        data-slot="low-stock-row-border"
        aria-hidden="true"
        className={cn("absolute left-0 top-1 bottom-1 w-0.5 rounded-r", borderClass)}
      />
      <div className="flex-1 min-w-0 pl-2">
        <div className="text-sm font-medium truncate">
          <span className="text-muted-foreground mr-1.5">{item.code_produit}</span>
          {item.nom_produit}
        </div>
        <div className="text-xs text-muted-foreground truncate">{item.nom_entrepot}</div>
      </div>
      <div
        data-slot="low-stock-row-status"
        className="shrink-0 flex items-center gap-1.5 text-xs"
      >
        <span aria-hidden="true" className={cn("size-1.5 rounded-full", borderClass)} />
        <span className="text-muted-foreground">{statusLabel}</span>
      </div>
    </div>
  )
}

export function LowStockList({
  items,
  maxItems = 6,
  title = "Alertes stock",
  description,
  className,
}: LowStockListProps) {
  const displayItems = items.slice(0, maxItems)

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <div
            data-slot="low-stock-list-empty"
            className="flex flex-col items-center justify-center py-8 text-center"
          >
            <div className="rounded-full bg-muted p-4 mb-3">
              <span aria-hidden="true" className="block size-6 text-muted-foreground">
                ✓
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Aucune alerte de stock</p>
            <p className="text-xs text-muted-foreground mt-1">
              Tous les produits sont à un niveau normal.
            </p>
          </div>
        ) : (
          <div data-slot="low-stock-list">
            {displayItems.map((item) => (
              <LowStockRow key={`${item.id_produit}-${item.id_entrepot}`} item={item} />
            ))}
            <div className="px-3 pt-1 pb-2">
              <a
                href="/stock?filter=low"
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
}
