export type StockStatusVariant = "success" | "warning" | "destructive"

export function getStockStatusVariant(stock: number, stockMinimum: number): StockStatusVariant {
  if (stock <= 0) return "destructive"
  if (stock <= stockMinimum) return "warning"
  return "success"
}
