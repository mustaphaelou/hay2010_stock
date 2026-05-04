"use client"

import * as React from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { Empty } from "@/components/ui/empty"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatPrice } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { ArticleDetailsSheet } from "@/components/erp/article-details-sheet"
import type { ArticleWithStock } from "@/lib/types"
import { getStockStatusVariant } from "@/lib/stock/compute-stock-status"

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

  const stats = React.useMemo(() => {
    const total = localData.length
    const lowStock = localData.filter(a => (a.stock_global || 0) <= (a.stock_minimum || 0)).length
    const inactive = localData.filter(a => a.en_sommeil).length
    const avgPrice = localData.length > 0
      ? localData.reduce((sum, a) => sum + Number(a.prix_vente || 0), 0) / localData.length
      : 0
    return { total, lowStock, inactive, avgPrice }
  }, [localData])

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
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} variant="kpi"><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Skeleton className="h-10 w-full sm:w-[300px]" />
          <Skeleton className="h-10 w-full sm:w-[200px]" />
        </div>
        <Card><CardContent className="p-0"><div className="p-4"><Skeleton className="h-64 w-full" /></div></CardContent></Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 stagger-children">
        <Card variant="kpi" className="hover-lift glow">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Articles</CardTitle>
            <div className="icon-container">
              <HugeiconsIcon icon={PackageIcon} className="text-primary" />
            </div>
          </CardHeader>
          <CardContent className="p-0 pt-3">
            <div className="text-2xl font-extrabold animate-count-up">{stats.total}</div>
            <p className="text-xs text-muted-foreground font-medium mt-1">Références actives</p>
          </CardContent>
        </Card>

        <Card variant="kpi" className={cn("hover-lift glow", stats.lowStock > 0 && "ring-warning/30")}>
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stock Faible</CardTitle>
            <div className={cn("icon-container", stats.lowStock > 0 && "bg-warning/10")}>
              <HugeiconsIcon icon={Alert01Icon} className={cn("text-primary", stats.lowStock > 0 && "text-warning")} />
            </div>
          </CardHeader>
          <CardContent className="p-0 pt-3">
            <div className={cn("text-2xl font-extrabold animate-count-up", stats.lowStock > 0 && "text-warning")}>{stats.lowStock}</div>
            <p className="text-xs text-muted-foreground font-medium mt-1">Sous le seuil minimum</p>
          </CardContent>
        </Card>

        <Card variant="kpi" className="hover-lift glow">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">En Sommeil</CardTitle>
            <div className="icon-container">
              <HugeiconsIcon icon={PackageIcon} className="text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-0 pt-3">
            <div className="text-2xl font-extrabold animate-count-up">{stats.inactive}</div>
            <p className="text-xs text-muted-foreground font-medium mt-1">Articles désactivés</p>
          </CardContent>
        </Card>

        <Card variant="kpi" className="hover-lift glow">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prix Moyen</CardTitle>
            <div className="icon-container">
              <HugeiconsIcon icon={FilterIcon} className="text-primary" />
            </div>
          </CardHeader>
          <CardContent className="p-0 pt-3">
            <div className="text-xl font-extrabold animate-count-up">{formatPrice(stats.avgPrice)}</div>
            <p className="text-xs text-muted-foreground font-medium mt-1">Prix de vente moyen</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <HugeiconsIcon
            icon={Search01Icon}
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
          />
          <Input
            placeholder="Rechercher un article ou code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label="Rechercher un article ou code"
          />
        </div>
        <Select value={familyFilter} onValueChange={(value) => setFamilyFilter(value ?? "Toutes")}>
          <SelectTrigger className="w-full sm:w-[200px]" aria-label="Filtrer par famille">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={FilterIcon} className="size-4 text-muted-foreground" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {families.map(family => (
                <SelectItem key={family} value={family || "Sans famille"}>
                  {family || "Sans famille"}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Liste des Articles</CardTitle>
              <CardDescription className="text-xs">{filteredData.length} article(s) trouvé(s)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredData.length === 0 ? (
            <div className="p-6">
              <Empty
                title="Aucun article trouvé"
                description="Essayez de modifier vos critères de recherche."
                icon={PackageIcon}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="hover:bg-transparent">
                    <TableHead scope="col" className="w-[140px] font-semibold uppercase tracking-wider text-xs">Référence</TableHead>
                    <TableHead scope="col" className="font-semibold uppercase tracking-wider text-xs">Article</TableHead>
                    <TableHead scope="col" className="font-semibold uppercase tracking-wider text-xs mobile-hide">Modifié le</TableHead>
                    <TableHead scope="col" className="text-right font-semibold uppercase tracking-wider text-xs">Prix Vente</TableHead>
                    <TableHead scope="col" className="text-right font-semibold uppercase tracking-wider text-xs">Stock</TableHead>
                    <TableHead scope="col" className="w-[50px]"><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((article) => (
                    <TableRow
                      key={article.id_produit}
                      className={cn(
                        "group transition-all hover:bg-muted/50 cursor-pointer",
                        article.en_sommeil && "opacity-60"
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
                      <TableCell className="py-3">
                        <Badge variant="outline" className="font-mono text-xs">
                          {article.code_produit}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex flex-col gap-0.5 max-w-[300px]">
                          <span className="font-medium text-sm truncate group-hover:text-primary transition-colors">{article.nom_produit}</span>
                          <div className="flex items-center gap-2">
                            {article.famille && (
                              <Badge variant="secondary" className="text-[11px]">{article.famille}</Badge>
                            )}
                            {article.en_sommeil && (
                              <Badge variant="destructive" className="h-4 text-[9px] uppercase px-1">En sommeil</Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 text-muted-foreground text-xs mobile-hide">
                        {article.date_modification ? new Date(article.date_modification).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell className="text-right py-3">
                        <span className="font-semibold text-primary tabular-nums">{formatPrice(Number(article.prix_vente) || 0)}</span>
                      </TableCell>
                      <TableCell className="text-right py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Badge variant={getStockStatusVariant(Number(article.stock_global ?? 0), article.stock_minimum ?? 0)}>
                            {article.stock_global}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-3">
                        <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
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
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
