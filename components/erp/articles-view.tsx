"use client"

import * as React from "react"
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
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card"
import {
    Command,
    CommandInput,
    CommandList,
    CommandEmpty,
    CommandGroup,
    CommandItem,
} from "@/components/ui/command"

import { toggleArticleStatus } from "@/app/actions/articles"

// Extended type with stock and parsed numbers
export type ArticleWithStock = {
    id_produit: number
    code_produit: string
    nom_produit: string
    famille: string | null
    description_produit: string | null
    code_barre_ean: string | null
    unite_mesure: string
    prix_achat: number
    prix_vente: number
    coefficient: number
    taux_tva: number | string | null
    stock_minimum: number | null
    stock_maximum: number | null
    activer_suivi_stock: boolean
    en_sommeil: boolean
    est_actif: boolean
    date_creation: Date
    date_modification: Date
    stock_global: number
}

interface ArticlesViewProps {
    initialData: ArticleWithStock[]
}

// Define columns
const createColumns = (onViewDetails: (article: ArticleWithStock) => void): ColumnDef<ArticleWithStock>[] => [
    {
        accessorKey: "code_produit",
        header: "Référence",
        cell: ({ row }) => <div className="font-medium text-primary">{row.getValue("code_produit")}</div>,
    },
    {
        accessorKey: "nom_produit",
        header: "Désignation",
    },
    {
        accessorKey: "famille",
        id: "famille",
        header: "Famille",
        cell: ({ row }) => {
            const famille = row.original.famille
            return famille ? <Badge variant="outline">{famille}</Badge> : "-"
        },
    },
    {
        accessorKey: "prix_vente",
        header: () => <div className="text-right">Prix Vente HT</div>,
        cell: ({ row }) => {
            const price = parseFloat(row.getValue("prix_vente") || "0")
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
        accessorKey: "en_sommeil",
        header: "Statut",
        cell: ({ row }) => {
            const isSommeil = row.getValue("en_sommeil") as boolean
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
                            onClick={() => navigator.clipboard.writeText(article.code_produit)}
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
    const [selectedStatus, setSelectedStatus] = React.useState<"all" | "active" | "sommeil">("active")
    const [isFilterOpen, setIsFilterOpen] = React.useState(false)
    const [localData, setLocalData] = React.useState<ArticleWithStock[]>(initialData)
    const [isUpdating, setIsUpdating] = React.useState(false)

    React.useEffect(() => {
        setLocalData(initialData)
    }, [initialData])

    const familles = React.useMemo(() => {
        const familleSet = new Set<string>()
        localData.forEach(article => {
            if (article.famille) {
                familleSet.add(article.famille)
            }
        })
        return Array.from(familleSet).sort()
    }, [localData])

    const filteredData = React.useMemo(() => {
        return localData.filter(article => {
            const matchesFamille = selectedFamille === "all" || article.famille === selectedFamille
            const matchesStatus =
                selectedStatus === "all" ||
                (selectedStatus === "active" && !article.en_sommeil) ||
                (selectedStatus === "sommeil" && article.en_sommeil)

            return matchesFamille && matchesStatus
        })
    }, [localData, selectedFamille, selectedStatus])

    const handleViewDetails = (article: ArticleWithStock) => {
        setSelectedArticle(article)
        setIsDetailsOpen(true)
    }

    const columns = React.useMemo(() => createColumns(handleViewDetails), [])

    const formatDate = (dateValue: Date | string) => {
        if (!dateValue) return "-"
        return new Date(dateValue).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const handleToggleStatus = async (article: ArticleWithStock) => {
        setIsUpdating(true)
        try {
            const newStatus = !article.en_sommeil
            const res = await toggleArticleStatus(article.id_produit, newStatus)

            if (res.error) throw new Error(res.error)

            const updatedData = localData.map(a =>
                a.id_produit === article.id_produit ? { ...a, en_sommeil: newStatus } : a
            )
            setLocalData(updatedData)

            if (selectedArticle?.id_produit === article.id_produit) {
                setSelectedArticle({ ...selectedArticle, en_sommeil: newStatus })
            }
        } catch (error) {
            console.error("Error updating article status:", error)
        } finally {
            setIsUpdating(false)
        }
    }

    return (
        <div className="space-y-6 sm:space-y-8 animate-fade-in-up">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between px-1">
                <div className="flex flex-col gap-1">
                    <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight gradient-text">Gestion des Articles</h2>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-primary" />
                        {filteredData.length} articles trouvés sur {localData.length} au total
                    </p>
                </div>

                <div className="grid grid-cols-2 lg:flex items-center gap-2 lg:gap-3">
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            className={cn(buttonVariants({ variant: "outline" }), "w-full lg:w-auto gap-2 lg:h-11 rounded-xl shadow-sm border-muted/60")}
                        >
                            <div className={`h-2 w-2 rounded-full ${selectedStatus === "active" ? "bg-green-500" :
                                selectedStatus === "sommeil" ? "bg-slate-400" : "bg-primary"
                                }`} />
                            <span className="truncate">
                                {selectedStatus === "all" ? "Tous les statuts" :
                                    selectedStatus === "active" ? "Actifs" : "Sommeil"}
                            </span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                            <DropdownMenuItem onClick={() => setSelectedStatus("all")}>Tous les statuts</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSelectedStatus("active")}>Articles Actifs</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSelectedStatus("sommeil")}>Articles en sommeil</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="relative w-full lg:w-auto">
                        <Button
                            variant="outline"
                            className="w-full lg:min-w-[180px] justify-between lg:h-11 rounded-xl shadow-sm border-muted/60"
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                        >
                            <span className="flex items-center gap-2 truncate">
                                <HugeiconsIcon icon={TagsIcon} className="h-4 w-4" />
                                <span className="truncate">
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
                                <div className="absolute right-0 top-full mt-2 z-50 w-[280px] max-w-[calc(100vw-2rem)] rounded-xl border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95 overflow-hidden">
                                    <Command>
                                        <CommandInput placeholder="Rechercher une famille..." className="h-10" />
                                        <CommandList className="max-h-[40vh]">
                                            <CommandEmpty>Aucune famille trouvée.</CommandEmpty>
                                            <CommandGroup>
                                                <CommandItem
                                                    onSelect={() => {
                                                        setSelectedFamille("all")
                                                        setIsFilterOpen(false)
                                                    }}
                                                    className={cn("py-2.5 px-4 cursor-pointer", selectedFamille === "all" ? "bg-accent" : "")}
                                                >
                                                    <span className="flex-1 font-medium">Toutes les familles</span>
                                                    <Badge variant="secondary" className="text-[10px]">{localData.length}</Badge>
                                                </CommandItem>
                                                {familles.map((famille) => {
                                                    const count = localData.filter(a => a.famille === famille).length
                                                    return (
                                                        <CommandItem
                                                            key={famille}
                                                            onSelect={() => {
                                                                setSelectedFamille(famille)
                                                                setIsFilterOpen(false)
                                                            }}
                                                            className={cn("py-2.5 px-4 cursor-pointer", selectedFamille === famille ? "bg-accent" : "")}
                                                        >
                                                            <span className="flex-1 truncate">{famille}</span>
                                                            <Badge variant="secondary" className="text-[10px]">{count}</Badge>
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

                    <Button className="col-span-2 lg:col-auto lg:h-11 lg:px-6 hover-lift shadow-md rounded-xl font-bold">
                        <span className="mr-2 text-xl">+</span> Nouveau Produit
                    </Button>
                </div>
            </div>

            <Card className="overflow-hidden border-muted/40 shadow-sm transition-all hover:shadow-md">
                <CardHeader className="pb-4 bg-muted/20 border-b">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <HugeiconsIcon icon={PackageIcon} className="h-5 w-5 text-primary" />
                                Catalogue Articles
                            </CardTitle>
                            <CardDescription>Gérez votre inventaire et vos références produits.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0 sm:p-2">
                    <DataTable
                        columns={columns}
                        data={filteredData}
                        searchKey="nom_produit"
                        placeholder="Chercher par nom, référence..."
                        loading={false}
                    />
                </CardContent>
            </Card>

            <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <SheetContent className="w-full sm:max-w-md overflow-y-auto p-4 sm:p-6">
                    <SheetHeader className="pb-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">
                                {selectedArticle?.code_produit}
                            </Badge>
                            {selectedArticle?.famille && (
                                <Badge variant="secondary">
                                    {selectedArticle.famille}
                                </Badge>
                            )}
                        </div>
                        <SheetTitle className="text-xl font-bold leading-tight">
                            {selectedArticle?.nom_produit}
                        </SheetTitle>
                        <SheetDescription>
                            Détails complets de l&apos;article et informations de stock.
                        </SheetDescription>
                        <div className="flex items-center justify-between pt-4 border-t mt-4">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-medium">Statut de l&apos;article</Label>
                                <p className="text-xs text-muted-foreground">
                                    {selectedArticle?.en_sommeil ? "Désactivé (En sommeil)" : "Activé (En vente)"}
                                </p>
                            </div>
                            <Switch
                                checked={!selectedArticle?.en_sommeil}
                                onCheckedChange={() => selectedArticle && handleToggleStatus(selectedArticle)}
                                disabled={isUpdating}
                            />
                        </div>
                    </SheetHeader>

                    <Separator />

                    <div className="grid gap-5 py-4 sm:py-6 px-0 sm:px-1">
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground/70 uppercase tracking-wider">
                                <HugeiconsIcon icon={InformationCircleIcon} className="h-4 w-4" />
                                Informations Générales
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase">Référence</p>
                                    <p className="font-medium">{selectedArticle?.code_produit}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase">Famille</p>
                                    <p className="font-medium">{selectedArticle?.famille || "-"}</p>
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase">Désignation Complémentaire</p>
                                    <p className="font-medium">{selectedArticle?.description_produit || "-"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase">Code Barre</p>
                                    <div className="flex items-center gap-2">
                                        <HugeiconsIcon icon={BarCode02Icon} className="h-4 w-4 text-muted-foreground" />
                                        <p className="font-medium font-mono">{selectedArticle?.code_barre_ean || "-"}</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase">Unité de mesure</p>
                                    <p className="font-medium">{selectedArticle?.unite_mesure || "Unité"}</p>
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-muted/50" />

                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground/70 uppercase tracking-wider">
                                <HugeiconsIcon icon={Money01Icon} className="h-4 w-4" />
                                Tarification
                            </h3>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-4 bg-muted/30 p-4 rounded-lg">
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase">Prix Achat HT</p>
                                    <p className="text-lg font-bold text-blue-600">{formatPrice(selectedArticle?.prix_achat || 0)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase">Prix Vente HT</p>
                                    <p className="text-lg font-bold text-green-600">{formatPrice(selectedArticle?.prix_vente || 0)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase">Coefficient</p>
                                    <Badge variant="outline" className="font-mono">{selectedArticle?.coefficient || "1.00"}</Badge>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase">TVA %</p>
                                    <p className="text-sm font-medium">{String(selectedArticle?.taux_tva) || "20.0"}</p>
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-muted/50" />

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
                                        <div className={`h-2 w-2 rounded-full ${selectedArticle?.activer_suivi_stock ? 'bg-green-500' : 'bg-red-500'}`} />
                                        <p className="text-sm font-medium">{selectedArticle?.activer_suivi_stock ? 'Activé' : 'Désactivé'}</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase">Stock Mini</p>
                                    <p className="font-medium">{selectedArticle?.stock_minimum || 0}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase">Stock Maxi</p>
                                    <p className="font-medium">{selectedArticle?.stock_maximum || 0}</p>
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-muted/50" />

                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground/70 uppercase tracking-wider">
                                <HugeiconsIcon icon={Calendar01Icon} className="h-4 w-4" />
                                Audit & Dates
                            </h3>
                            <div className="space-y-3 bg-muted/20 p-3 rounded-md text-xs">
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Date Création</span>
                                    <span className="font-medium">{selectedArticle?.date_creation ? formatDate(selectedArticle.date_creation) : "-"}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Dernière Modification</span>
                                    <span className="font-medium">{selectedArticle?.date_modification ? formatDate(selectedArticle.date_modification) : "-"}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    )
}
