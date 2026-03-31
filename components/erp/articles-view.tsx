"use client"

import * as React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { SafeIcon as HugeiconsIcon } from "@/components/ui/safe-icon"
import {
  ViewIcon,
  PackageIcon,
  Alert01Icon,
  Search01Icon,
  FilterIcon,
} from "@hugeicons/core-free-icons"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatPrice } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { ArticleDetailsSheet } from "@/components/erp/article-details-sheet"
import type { ArticleWithStock } from "@/lib/types"

function getStockLevelText(stock: number, stockMinimum: number): string {
  if (stock <= 0) return "Stock épuisé"
  if (stock <= stockMinimum) return "Stock faible"
  return "Stock suffisant"
}

interface ArticlesViewProps {
    data: ArticleWithStock[]
    isLoading?: boolean
}

const ArticlesView = React.memo(function ArticlesView({ data, isLoading }: ArticlesViewProps) {
    const [searchQuery, setSearchQuery] = React.useState("")
    const [familyFilter, setFamilyFilter] = React.useState("Toutes")
    const [selectedArticle, setSelectedArticle] = React.useState<ArticleWithStock | null>(null)
    const [isSheetOpen, setIsSheetOpen] = React.useState(false)
    const [localData, setLocalData] = React.useState<ArticleWithStock[]>(data)

    // Sync with prop data when it changes
    React.useEffect(() => {
        setLocalData(data)
    }, [data])

    const families = React.useMemo(() => {
        const uniqueFamilies = new Set(data.map(a => a.famille).filter(Boolean))
        return ["Toutes", ...Array.from(uniqueFamilies)]
    }, [data])

    const filteredData = React.useMemo(() => {
        return localData.filter(article => {
            const matchesSearch =
                article.nom_produit?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                article.code_produit?.toLowerCase().includes(searchQuery.toLowerCase())
            const matchesFamily = familyFilter === "Toutes" || article.famille === familyFilter
            return matchesSearch && matchesFamily
        })
    }, [localData, searchQuery, familyFilter])

  const handleOpenDetails = React.useCallback((article: ArticleWithStock) => {
    setSelectedArticle(article)
    setIsSheetOpen(true)
  }, [])

const handleStatusChange = React.useCallback((updatedArticle: ArticleWithStock, newStatus: boolean) => {
setLocalData(prev => prev.map(article => (
article.id_produit === updatedArticle.id_produit
? { ...article, en_sommeil: newStatus }
: article
)))
setSelectedArticle(prev => 
prev?.id_produit === updatedArticle.id_produit
? { ...prev, en_sommeil: newStatus }
: prev
)
}, [])

if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <Skeleton className="h-10 w-full sm:w-[300px]" />
                    <Skeleton className="h-10 w-full sm:w-[200px]" />
                </div>
                <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
                    <div className="p-4 bg-muted/50 border-b">
                        <div className="grid grid-cols-5 gap-4">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-20" />
                        </div>
                    </div>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="p-4 border-b last:border-0">
                            <div className="grid grid-cols-5 gap-4">
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-4 w-48" />
                                <Skeleton className="h-4 w-12" />
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-4 w-24" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col space-y-4">
            {/* Control Bar */}
            <div className="bg-card/50 backdrop-blur-sm p-3 rounded-xl border border-border flex flex-col sm:flex-row gap-3 shadow-sm">
                <div className="relative flex-1 group">
                    <HugeiconsIcon
                        icon={Search01Icon}
                        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors"
                    />
<Input
              placeholder="Rechercher un article ou code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 border-none bg-muted/30 focus-visible:ring-1 focus-visible:ring-primary/50"
              aria-label="Rechercher un article ou code"
            />
                </div>
                <div className="flex gap-2 items-center">
<Select value={familyFilter} onValueChange={(value) => setFamilyFilter(value ?? "Toutes")}>
            <SelectTrigger className="w-full sm:w-[200px] h-10 bg-muted/30 border-none focus:ring-1 focus:ring-primary/50" aria-label="Filtrer par famille">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={FilterIcon} className="size-4 text-muted-foreground" />
                <SelectValue />
              </div>
            </SelectTrigger>
                        <SelectContent>
                            {families.map(family => (
                                <SelectItem key={family} value={family || "Sans famille"}>
                                    {family || "Sans famille"}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Main Table */}
            <div className="rounded-xl border border-border/60 overflow-hidden bg-card shadow-lg shadow-black/5 animate-in fade-in duration-500">
                <Table>
<TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent border-border/40">
              <TableHead scope="col" className="w-[140px] font-semibold text-foreground/70 uppercase tracking-widest text-[10px]">Référence</TableHead>
              <TableHead scope="col" className="font-semibold text-foreground/70 uppercase tracking-widest text-[10px]">Article</TableHead>
              <TableHead scope="col" className="font-semibold text-foreground/70 uppercase tracking-widest text-[10px]">Dernière Modification</TableHead>
              <TableHead scope="col" className="text-right font-semibold text-foreground/70 uppercase tracking-widest text-[10px]">Prix Vente</TableHead>
              <TableHead scope="col" className="text-right font-semibold text-foreground/70 uppercase tracking-widest text-[10px]">Stock</TableHead>
              <TableHead scope="col" className="w-[50px]"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
                    <TableBody>
                        {filteredData.length === 0 ? (
<TableRow>
              <TableCell colSpan={6} className="h-40 text-center">
                <div className="flex flex-col items-center justify-center gap-2 opacity-50" role="status" aria-live="polite">
                  <HugeiconsIcon icon={PackageIcon} className="size-10" aria-hidden="true" />
                  <p>Aucun article trouvé</p>
                </div>
              </TableCell>
            </TableRow>
                        ) : (
                            filteredData.map((article) => (
<TableRow
          key={article.id_produit}
          className={cn(
            "group transition-all hover:bg-muted/30 cursor-pointer border-border/40",
            article.en_sommeil && "opacity-60 bg-muted/10"
          )}
          onClick={() => handleOpenDetails(article)}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleOpenDetails(article)
            }
          }}
          aria-label={`${article.nom_produit}, ${article.code_produit}`}
          role="button"
        >
                                    <TableCell className="py-4">
                                        <Badge variant="outline" className="font-mono text-xs bg-muted/40 border-border/50 group-hover:border-primary/30 transition-colors">
                                            {article.code_produit}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <div className="flex flex-col gap-0.5 max-w-[300px]">
                                            <span className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">{article.nom_produit}</span>
                                            <div className="flex items-center gap-2">
                                                {article.famille && (
                                                    <span className="text-[11px] text-muted-foreground bg-muted p-0.5 px-1 rounded">{article.famille}</span>
                                                )}
                                                {article.en_sommeil && (
                                                    <Badge variant="destructive" className="h-4 text-[9px] uppercase px-1">En sommeil</Badge>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4 text-muted-foreground text-xs italic">
                                        {article.date_modification ? new Date(article.date_modification).toLocaleDateString() : '-'}
                                    </TableCell>
                                    <TableCell className="text-right py-4">
                                        <span className="font-semibold text-primary">{formatPrice(Number(article.prix_vente) || 0)}</span>
                                    </TableCell>
<TableCell className="text-right py-4">
                <div className="flex items-center justify-end gap-2">
                  <span className={cn(
                    "font-bold text-sm",
                    Number(article.stock_global) <= 0 ? "text-destructive" :
                    Number(article.stock_global) <= (article.stock_minimum || 0) ? "text-amber-500" :
                    "text-foreground"
                  )}
                  aria-label={`${article.stock_global} unités, ${getStockLevelText(Number(article.stock_global), article.stock_minimum || 0)}`}
                  >
                    {article.stock_global}
                  </span>
                  <span className="sr-only">
                    {getStockLevelText(Number(article.stock_global), article.stock_minimum || 0)}
                  </span>
                  {Number(article.stock_global) <= (article.stock_minimum || 0) && (
                    <HugeiconsIcon icon={Alert01Icon} className="size-3.5 text-amber-500" aria-hidden="true" />
                  )}
                </div>
              </TableCell>
                                    <TableCell className="text-right py-4">
                                        <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
<Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full hover:bg-primary/10 hover:text-primary"
                onClick={(e) => {
                  e.stopPropagation()
                  handleOpenDetails(article)
                }}
                aria-label={`Voir les détails de ${article.nom_produit}`}
              >
                <HugeiconsIcon icon={ViewIcon} className="size-4" aria-hidden="true" />
              </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination/Status Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-muted/20 p-3 rounded-lg border border-border/40 gap-4">
<div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
            <div className="flex items-center gap-1.5 bg-background/50 px-2 py-1 rounded border border-border/40" aria-live="polite">
              <HugeiconsIcon icon={PackageIcon} className="size-3.5" aria-hidden="true" />
              <span>Total: <span className="text-foreground">{localData.length}</span> articles</span>
            </div>
            <div className="flex items-center gap-1.5 bg-background/50 px-2 py-1 rounded border border-border/40" aria-live="polite">
              <HugeiconsIcon icon={Alert01Icon} className="size-3.5 text-amber-500" aria-hidden="true" />
              <span>Stock Faible: <span className="text-amber-600">{localData.filter(a => (a.stock_global || 0) <= (a.stock_minimum || 0)).length}</span></span>
            </div>
          </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Lignes par page:</span>
<Select defaultValue="20">
                <SelectTrigger className="h-8 w-16 bg-background text-xs" aria-label="Lignes par page">
                  <SelectValue />
                </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Detailed Sheet Component */}
            <ArticleDetailsSheet
                article={selectedArticle}
                open={isSheetOpen}
                onOpenChange={setIsSheetOpen}
                onStatusChange={handleStatusChange}
    />
  </div>
  )
})

export { ArticlesView }
