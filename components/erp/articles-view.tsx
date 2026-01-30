"use client"

import * as React from "react"
import { FArticle } from "@/lib/supabase/types"
import { DataTable } from "@/components/erp/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { HugeiconsIcon } from "@hugeicons/react"
import {
    MoreVerticalIcon,
    AlertCircleIcon,
} from "@hugeicons/core-free-icons"
import { formatPrice } from "@/lib/utils/format"
import { Switch } from "@/components/ui/switch"
import { createClient } from "@/lib/supabase/client"
import { Label } from "@/components/ui/label"

import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet"
import {
    InformationCircleIcon,
    PackageIcon,
    TagsIcon,
    Money01Icon,
    BarCode02Icon,
    Calendar01Icon,
} from "@hugeicons/core-free-icons"
import { Separator } from "@/components/ui/separator"
import {
    Command,
    CommandInput,
    CommandList,
    CommandEmpty,
    CommandGroup,
    CommandItem,
} from "@/components/ui/command"

// Extended type with stock data
export type ArticleWithStock = FArticle & {
    stock_global: number
    f_famille?: { fa_intitule: string } | null
}

interface ArticlesViewProps {
    initialData: ArticleWithStock[]
}

// Define columns
const createColumns = (onViewDetails: (article: ArticleWithStock) => void): ColumnDef<ArticleWithStock>[] => [
    {
        accessorKey: "ar_ref",
        header: "Référence",
        cell: ({ row }) => <div className="font-medium text-primary">{row.getValue("ar_ref")}</div>,
    },
    {
        accessorKey: "ar_design",
        header: "Désignation",
    },
    {
        accessorKey: "f_famille.fa_intitule",
        id: "famille",
        header: "Famille",
        cell: ({ row }) => {
            const famille = row.original.f_famille?.fa_intitule
            return famille ? <Badge variant="outline">{famille}</Badge> : "-"
        },
    },
    {
        accessorKey: "ar_prixven",
        header: () => <div className="text-right">Prix Vente HT</div>,
        cell: ({ row }) => {
            const price = parseFloat(row.getValue("ar_prixven") || "0")
            return <div className="text-right font-medium">{formatPrice(price)}</div>
        },
    },
    {
        accessorKey: "stock_global",
        header: () => <div className="text-right">Stock (Global)</div>,
        cell: ({ row }) => {
            const stock = row.original.stock_global || 0
            const isLowStock = stock <= 5 && stock > 0
            const isOutOfStock = stock === 0

            return (
                <div className={`text-right font-semibold flex items-center justify-end gap-1 ${isOutOfStock ? 'text-red-500' : isLowStock ? 'text-orange-500' : ''}`}>
                    {stock}
                    {isLowStock && (
                        <HugeiconsIcon icon={AlertCircleIcon} className="h-4 w-4 text-orange-500" aria-hidden="true" />
                    )}
                    {isOutOfStock && (
                        <HugeiconsIcon icon={AlertCircleIcon} className="h-4 w-4 text-red-500" aria-hidden="true" />
                    )}
                </div>
            )
        }
    },
    {
        accessorKey: "ar_sommeil",
        header: "Statut",
        cell: ({ row }) => {
            const isSommeil = row.getValue("ar_sommeil") as boolean
            return (
                <Badge variant={isSommeil ? "secondary" : "default"} className={isSommeil ? "bg-slate-100 text-slate-500" : "bg-green-100 text-green-700 hover:bg-green-100"}>
                    {isSommeil ? "En sommeil" : "Actif"}
                </Badge>
            )
        }
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const article = row.original

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="Ouvrir le menu d'actions"
                    >
                        <span className="sr-only">Menu</span>
                        <HugeiconsIcon icon={MoreVerticalIcon} className="h-4 w-4" aria-hidden="true" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                            onClick={() => navigator.clipboard.writeText(article.ar_ref)}
                        >
                            Copier référence
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onViewDetails(article)}>
                            Voir détails
                        </DropdownMenuItem>
                        <DropdownMenuItem>Mouvements stock</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        },
    },
]

export function ArticlesView({ initialData }: ArticlesViewProps) {
    const [selectedArticle, setSelectedArticle] = React.useState<ArticleWithStock | null>(null)
    const [isDetailsOpen, setIsDetailsOpen] = React.useState(false)
    const [selectedFamille, setSelectedFamille] = React.useState<string>("all")
    const [selectedStatus, setSelectedStatus] = React.useState<"all" | "active" | "sommeil">("all")
    const [isFilterOpen, setIsFilterOpen] = React.useState(false)
    const [localData, setLocalData] = React.useState<ArticleWithStock[]>(initialData)
    const [isUpdating, setIsUpdating] = React.useState(false)

    // Sync local data with initialData when it changes
    React.useEffect(() => {
        setLocalData(initialData)
    }, [initialData])

    // Extract unique familles for filter dropdown
    const familles = React.useMemo(() => {
        const familleSet = new Set<string>()
        localData.forEach(article => {
            if (article.f_famille?.fa_intitule) {
                familleSet.add(article.f_famille.fa_intitule)
            }
        })
        return Array.from(familleSet).sort()
    }, [localData])

    // Filter articles by selected famille and status
    const filteredData = React.useMemo(() => {
        return localData.filter(article => {
            const matchesFamille = selectedFamille === "all" || article.f_famille?.fa_intitule === selectedFamille
            const matchesStatus =
                selectedStatus === "all" ||
                (selectedStatus === "active" && !article.ar_sommeil) ||
                (selectedStatus === "sommeil" && article.ar_sommeil)

            return matchesFamille && matchesStatus
        })
    }, [localData, selectedFamille, selectedStatus])

    const handleViewDetails = (article: ArticleWithStock) => {
        setSelectedArticle(article)
        setIsDetailsOpen(true)
    }

    const columns = React.useMemo(() => createColumns(handleViewDetails), [])

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const toggleStatus = async (article: ArticleWithStock) => {
        const supabase = createClient()
        setIsUpdating(true)

        try {
            const newStatus = !article.ar_sommeil
            const { error } = await supabase
                .from('f_article')
                .update({ ar_sommeil: newStatus })
                .eq('ar_ref', article.ar_ref)

            if (error) throw error

            // Update local state
            const updatedData = localData.map(a =>
                a.ar_ref === article.ar_ref ? { ...a, ar_sommeil: newStatus } : a
            )
            setLocalData(updatedData)

            if (selectedArticle?.ar_ref === article.ar_ref) {
                setSelectedArticle({ ...selectedArticle, ar_sommeil: newStatus })
            }
        } catch (error) {
            console.error("Error updating article status:", error)
        } finally {
            setIsUpdating(false)
        }
    }

    return (
        <div className="space-y-4 animate-fade-in-up px-1 sm:px-0">
            {/* Responsive header - stacked on mobile */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="text-center sm:text-left">
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Articles</h2>
                    <p className="text-sm text-muted-foreground">
                        {filteredData.length}{selectedFamille !== "all" ? ` / ${localData.length}` : ""} articles
                    </p>
                </div>

                {/* Filters row - horizontal scroll on mobile */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 sm:overflow-visible -mx-1 px-1 sm:mx-0 sm:px-0">
                    {/* Status Filter */}
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            className={cn(buttonVariants({ variant: "outline" }), "gap-2 h-10 sm:h-9 flex-shrink-0")}
                        >
                            <div className={`h-2 w-2 rounded-full ${selectedStatus === "active" ? "bg-green-500" :
                                selectedStatus === "sommeil" ? "bg-slate-400" : "bg-primary"
                                }`} />
                            <span className="hidden sm:inline">
                                {selectedStatus === "all" ? "Tous les statuts" :
                                    selectedStatus === "active" ? "Actifs uniquement" : "En sommeil"}
                            </span>
                            <span className="sm:hidden">
                                {selectedStatus === "all" ? "Tous" :
                                    selectedStatus === "active" ? "Actifs" : "Sommeil"}
                            </span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedStatus("all")}>Tous les statuts</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSelectedStatus("active")}>Articles Actifs</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSelectedStatus("sommeil")}>Articles en sommeil</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Searchable Famille Filter */}
                    <div className="relative flex-shrink-0">
                        <Button
                            variant="outline"
                            className="min-w-[140px] sm:min-w-[180px] justify-between h-10 sm:h-9"
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                        >
                            <span className="flex items-center gap-2">
                                <HugeiconsIcon icon={TagsIcon} className="h-4 w-4" />
                                <span className="truncate max-w-[80px] sm:max-w-[120px]">
                                    {selectedFamille === "all" ? "Familles" : selectedFamille}
                                </span>
                            </span>
                        </Button>
                        {isFilterOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setIsFilterOpen(false)}
                                />
                                <div className="absolute right-0 sm:right-0 top-full mt-1 z-50 w-[280px] max-w-[calc(100vw-2rem)] rounded-md border bg-popover shadow-md">
                                    <Command>
                                        <CommandInput placeholder="Rechercher une famille..." className="h-11 sm:h-9" />
                                        <CommandList className="max-h-[50vh]">
                                            <CommandEmpty>Aucune famille trouvée.</CommandEmpty>
                                            <CommandGroup>
                                                <CommandItem
                                                    onSelect={() => {
                                                        setSelectedFamille("all")
                                                        setIsFilterOpen(false)
                                                    }}
                                                    className={cn("py-3 sm:py-2", selectedFamille === "all" ? "bg-accent" : "")}
                                                >
                                                    <span className="flex-1">Toutes les familles</span>
                                                    <span className="text-muted-foreground text-xs">({localData.length})</span>
                                                </CommandItem>
                                                {familles.map((famille) => {
                                                    const count = localData.filter(a => a.f_famille?.fa_intitule === famille).length
                                                    return (
                                                        <CommandItem
                                                            key={famille}
                                                            onSelect={() => {
                                                                setSelectedFamille(famille)
                                                                setIsFilterOpen(false)
                                                            }}
                                                            className={cn("py-3 sm:py-2", selectedFamille === famille ? "bg-accent" : "")}
                                                        >
                                                            <span className="flex-1 truncate">{famille}</span>
                                                            <span className="text-muted-foreground text-xs">({count})</span>
                                                        </CommandItem>
                                                    )
                                                })}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </div>
                            </>
                        )}
                    </div>
                    <Button className="h-10 sm:h-9 flex-shrink-0 whitespace-nowrap">
                        <span className="sm:hidden">+ Article</span>
                        <span className="hidden sm:inline">Nouveau Produit</span>
                    </Button>
                </div>
            </div>

            {/* Table card with responsive padding */}
            <div className="rounded-md border bg-card text-card-foreground shadow-sm p-2 sm:p-3">
                <DataTable
                    columns={columns}
                    data={filteredData}
                    searchKey="ar_design"
                    placeholder="Rechercher un article…"
                    loading={false}
                />
            </div>

            {/* Article Details Sheet */}
            {/* Article Details Sheet - Full screen on mobile */}
            <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <SheetContent className="w-full sm:max-w-md overflow-y-auto p-4 sm:p-6">
                    <SheetHeader className="pb-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">
                                {selectedArticle?.ar_ref}
                            </Badge>
                            {selectedArticle?.f_famille?.fa_intitule && (
                                <Badge variant="secondary">
                                    {selectedArticle.f_famille.fa_intitule}
                                </Badge>
                            )}
                        </div>
                        <SheetTitle className="text-xl font-bold leading-tight">
                            {selectedArticle?.ar_design}
                        </SheetTitle>
                        <SheetDescription>
                            Détails complets de l&apos;article et informations de stock.
                        </SheetDescription>
                        <div className="flex items-center justify-between pt-4 border-t mt-4">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-medium">Statut de l&apos;article</Label>
                                <p className="text-xs text-muted-foreground">
                                    {selectedArticle?.ar_sommeil ? "Désactivé (En sommeil)" : "Activé (En vente)"}
                                </p>
                            </div>
                            <Switch
                                checked={!selectedArticle?.ar_sommeil}
                                onCheckedChange={() => selectedArticle && toggleStatus(selectedArticle)}
                                disabled={isUpdating}
                            />
                        </div>
                    </SheetHeader>

                    <Separator />

                    <div className="grid gap-5 py-4 sm:py-6 px-0 sm:px-1">
                        {/* Section: Informations Générales */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground/70 uppercase tracking-wider">
                                <HugeiconsIcon icon={InformationCircleIcon} className="h-4 w-4" />
                                Informations Générales
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase">Référence</p>
                                    <p className="font-medium">{selectedArticle?.ar_ref}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase">Famille</p>
                                    <p className="font-medium">{selectedArticle?.f_famille?.fa_intitule || "-"}</p>
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase">Désignation Complémentaire</p>
                                    <p className="font-medium">{selectedArticle?.ar_descompl || "-"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase">Code Barre</p>
                                    <div className="flex items-center gap-2">
                                        <HugeiconsIcon icon={BarCode02Icon} className="h-4 w-4 text-muted-foreground" />
                                        <p className="font-medium font-mono">{selectedArticle?.ar_codebarre || "-"}</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase">Unité de vente</p>
                                    <p className="font-medium">{selectedArticle?.ar_unitevente || "Unité"}</p>
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-muted/50" />

                        {/* Section: Tarification */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground/70 uppercase tracking-wider">
                                <HugeiconsIcon icon={Money01Icon} className="h-4 w-4" />
                                Tarification
                            </h3>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-4 bg-muted/30 p-4 rounded-lg">
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase">Prix Achat HT</p>
                                    <p className="text-lg font-bold text-blue-600">{formatPrice(selectedArticle?.ar_prixach || 0)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase">Prix Vente HT</p>
                                    <p className="text-lg font-bold text-green-600">{formatPrice(selectedArticle?.ar_prixven || 0)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase">Coefficient</p>
                                    <Badge variant="outline" className="font-mono">{selectedArticle?.ar_coef || "1.00"}</Badge>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase">Prix TTC</p>
                                    <p className="text-sm font-medium">{formatPrice(selectedArticle?.ar_prixttc || 0)}</p>
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-muted/50" />

                        {/* Section: Stock */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground/70 uppercase tracking-wider">
                                <HugeiconsIcon icon={PackageIcon} className="h-4 w-4" />
                                Gestion des Stocks
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase">Stock Actuel</p>
                                    <p className={`text-2xl font-bold ${selectedArticle?.stock_global === 0 ? 'text-red-500' : 'text-primary'}`}>
                                        {selectedArticle?.stock_global}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase">Suivi Stock</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className={`h-2 w-2 rounded-full ${selectedArticle?.ar_suivistock ? 'bg-green-500' : 'bg-red-500'}`} />
                                        <p className="text-sm font-medium">{selectedArticle?.ar_suivistock ? 'Activé' : 'Désactivé'}</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase">Stock Mini</p>
                                    <p className="font-medium">{selectedArticle?.ar_stockmini || 0}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase">Stock Maxi</p>
                                    <p className="font-medium">{selectedArticle?.ar_stockmaxi || 0}</p>
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-muted/50" />

                        {/* Section: Audit */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground/70 uppercase tracking-wider">
                                <HugeiconsIcon icon={Calendar01Icon} className="h-4 w-4" />
                                Audit & Dates
                            </h3>
                            <div className="space-y-3 bg-muted/20 p-3 rounded-md text-xs">
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Date Création</span>
                                    <span className="font-medium">{selectedArticle?.ar_date_create ? formatDate(selectedArticle.ar_date_create) : "-"}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Dernière Modification</span>
                                    <span className="font-medium">{selectedArticle?.ar_date_modif ? formatDate(selectedArticle.ar_date_modif) : "-"}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    )
}
