'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SafeIcon as HugeiconsIcon } from "@/components/ui/safe-icon"
import {
  RefreshIcon,
  Store01Icon,
  PackageIcon,
  AlertCircleIcon,
} from "@hugeicons/core-free-icons"

import { ColumnDef } from "@tanstack/react-table"
import { formatPrice } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { getStockLevels, getDepots } from '@/app/actions/stock'
import type { StockLevelWithProduct, Depot as DepotType } from '@/lib/types'

type StockLevel = StockLevelWithProduct
type Depot = DepotType

import { DataTable } from "@/components/erp/data-table"

interface StockClientProps {
  initialStockData: StockLevel[]
  initialDepots: Depot[]
  initialError: string | null
}

const columns: ColumnDef<StockLevel>[] = [
  {
    accessorKey: "produit.code_produit",
    header: "Référence",
    cell: ({ row }) => <Badge variant="outline">{row.original.produit?.code_produit || '-'}</Badge>,
  },
  {
    accessorKey: "produit.nom_produit",
    id: "designation",
    header: "Désignation",
    cell: ({ row }) => {
      const design = row.original.produit?.nom_produit
      return <div className="max-w-[250px] truncate">{design || '-'}</div>
    },
  },
  {
    accessorKey: "entrepot.nom_entrepot",
    header: "Dépôt",
    cell: ({ row }) => {
      const entrepot = row.original.entrepot?.nom_entrepot
      return entrepot ? <Badge variant="secondary">{entrepot}</Badge> : '-'
    },
  },
  {
    accessorKey: "quantite_en_stock_num",
    header: () => <div className="text-right">Qté Disponible</div>,
    cell: ({ row }) => {
      const qty = Number(row.getValue("quantite_en_stock_num") || 0)
      const isLowStock = qty <= 5
      return (
        <div className={`text-right font-semibold flex items-center justify-end gap-1 ${isLowStock ? 'text-destructive' : ''}`}>
          {qty}
          {isLowStock && (
            <HugeiconsIcon icon={AlertCircleIcon} className="size-4 text-destructive" />
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "quantite_reservee_num",
    header: () => <div className="text-right">Qté Réservée</div>,
    cell: ({ row }) => {
      const qty = Number(row.getValue("quantite_reservee_num") || 0)
      return <div className="text-right text-muted-foreground">{qty}</div>
    },
  },
  {
    accessorKey: "cout_moyen_pondere",
    header: () => <div className="text-right">CMUP</div>,
    cell: ({ row }) => {
      const cmup = row.getValue("cout_moyen_pondere") as number
      return <div className="text-right">{formatPrice(cmup)}</div>
    },
  },
  {
    id: "value",
    header: () => <div className="text-right">Valeur</div>,
    cell: ({ row }) => {
      const qty = Number(row.original.quantite_en_stock_num || 0)
      const cmup = Number(row.original.cout_moyen_pondere || row.original.produit?.prix_achat || 0)
      const value = qty * cmup
      return <div className="text-right font-semibold text-primary">{formatPrice(value)}</div>
    },
  },
]

export default function StockClient({ initialStockData, initialDepots, initialError }: StockClientProps) {
  const [stockLevels, setStockLevels] = useState<StockLevel[]>(initialStockData)
  const [depots, setDepots] = useState<Depot[]>(initialDepots)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(initialError)
  const [selectedDepot, setSelectedDepot] = useState<string>('all')

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [stockResult, depotsData] = await Promise.all([
        getStockLevels(),
        getDepots()
      ])

      if (stockResult.error) {
        setError(stockResult.error)
        setStockLevels([])
      } else {
        setStockLevels(stockResult.data || [])
      }
      setDepots(depotsData || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des niveaux de stock')
    } finally {
      setLoading(false)
    }
  }

  const filteredStock = stockLevels.filter(stock => {
    const matchesDepot = selectedDepot === 'all' ||
      (stock.id_entrepot && stock.id_entrepot.toString() === selectedDepot)
    return matchesDepot
  })

  const totalStockValue = stockLevels.reduce((acc, s) => {
    const qty = Number(s.quantite_en_stock_num || 0)
    const price = Number(s.cout_moyen_pondere || s.produit?.prix_achat || 0)
    return acc + (qty * price)
  }, 0)

  const lowStockCount = stockLevels.filter(s => Number(s.quantite_en_stock_num || 0) <= 5).length
  const uniqueProducts = new Set(stockLevels.map(s => s.id_produit)).size

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0 pb-20 md:gap-8 md:p-8 md:pb-8 animate-fade-in-up">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight gradient-text">Niveaux de Stock</h1>
          <p className="text-sm text-muted-foreground font-medium">Suivi en temps réel des quantités par dépôt</p>
        </div>
        <Button onClick={fetchData} disabled={loading} size="lg">
          <HugeiconsIcon icon={RefreshIcon} className={cn("size-5", loading && "animate-spin")} data-icon="inline-start" />
          Actualiser
        </Button>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 stagger-children">
        <Card variant="kpi" className="hover-lift glow">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lignes Stock</CardTitle>
            <div className="icon-container">
              <HugeiconsIcon icon={PackageIcon} className="text-primary" />
            </div>
          </CardHeader>
          <CardContent className="p-0 pt-3">
            <div className="text-2xl font-extrabold animate-count-up">{stockLevels.length}</div>
            <p className="text-xs text-muted-foreground font-medium mt-1">{uniqueProducts} produits distincts</p>
          </CardContent>
        </Card>

        <Card variant="kpi" className="hover-lift glow">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Valeur Totale</CardTitle>
            <div className="icon-container">
              <HugeiconsIcon icon={Store01Icon} className="text-success" />
            </div>
          </CardHeader>
          <CardContent className="p-0 pt-3">
            <div className="text-xl font-extrabold text-primary animate-count-up">{formatPrice(totalStockValue)}</div>
            <p className="text-xs text-muted-foreground font-medium mt-1">Valorisation au CMUP</p>
          </CardContent>
        </Card>

        <Card variant="kpi" className="hover-lift glow">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dépôts</CardTitle>
            <div className="icon-container">
              <HugeiconsIcon icon={Store01Icon} className="text-warning" />
            </div>
          </CardHeader>
          <CardContent className="p-0 pt-3">
            <div className="text-2xl font-extrabold animate-count-up">{depots.length}</div>
            <p className="text-xs text-muted-foreground font-medium mt-1">Entrepôts actifs</p>
          </CardContent>
        </Card>

        <Card variant="kpi" className={cn("hover-lift glow", lowStockCount > 0 && "ring-warning/30")}>
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1">
            <CardTitle className={cn("text-xs font-semibold uppercase tracking-wider", lowStockCount > 0 ? "text-warning" : "text-muted-foreground")}>Alertes</CardTitle>
            <div className={cn("icon-container", lowStockCount > 0 && "bg-warning/10")}>
              <HugeiconsIcon icon={AlertCircleIcon} className={cn(lowStockCount > 0 ? "text-warning" : "text-muted-foreground")} />
            </div>
          </CardHeader>
          <CardContent className="p-0 pt-3">
            <div className={cn("text-2xl font-extrabold animate-count-up", lowStockCount > 0 && "text-warning")}>{lowStockCount}</div>
            <p className="text-xs text-muted-foreground font-medium mt-1">Qté ≤ 5 unités</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-4 items-start">
        <Card className="lg:col-span-1 sticky top-20">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <CardTitle className="text-base font-bold">Filtrer par Dépôt</CardTitle>
            <CardDescription>Affiner la vue par localisation</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Select value={selectedDepot} onValueChange={(value) => setSelectedDepot(value ?? 'all')}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">Tous les dépôts</SelectItem>
                  {depots.map(d => (
                    <SelectItem key={d.id_depot} value={d.id_depot.toString()}>
                      {d.nom_depot}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 overflow-hidden">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">État détaillé du Stock</CardTitle>
                <CardDescription>
                  {loading ? 'Chargement des données...' : `${filteredStock.length} ligne(s) trouvée(s)`}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {error ? (
              <div className="p-8 text-center">
                <HugeiconsIcon icon={AlertCircleIcon} className="mx-auto size-12 text-destructive/50 mb-4" />
                <p className="text-destructive font-semibold mb-4">{error}</p>
                <Button onClick={fetchData} variant="outline">Réessayer</Button>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={filteredStock}
                searchKey="designation"
                placeholder="Rechercher par désignation..."
                loading={loading}
                pageSize={10}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
