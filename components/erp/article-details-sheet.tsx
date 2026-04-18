"use client"

import * as React from "react"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { SafeIcon as HugeiconsIcon } from "@/components/ui/safe-icon"
import {
    InformationCircleIcon,
    PackageIcon,
    Money01Icon,
    BarCode02Icon,
    Calendar01Icon,
} from "@hugeicons/core-free-icons"
import { formatPrice, formatDate } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { toggleArticleStatus } from "@/app/actions/articles"
import type { ArticleWithStock } from "@/lib/types"
import { useCsrf } from "@/components/csrf-provider"

interface ArticleDetailsSheetProps {
    article: ArticleWithStock | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onStatusChange?: (article: ArticleWithStock, newStatus: boolean) => void
}

export function ArticleDetailsSheet({
    article,
    open,
    onOpenChange,
    onStatusChange,
}: ArticleDetailsSheetProps) {
    const [isUpdating, setIsUpdating] = React.useState(false)
    const { csrfToken } = useCsrf()

    const handleToggleStatus = async () => {
        if (!article) return
        if (!csrfToken) {
            console.error("No CSRF token available")
            return
        }
        setIsUpdating(true)
        try {
            const newStatus = !article.en_sommeil
            const res = await toggleArticleStatus(article.id_produit, newStatus, csrfToken)
            if (res.error) throw new Error(res.error)

            if (onStatusChange) {
                onStatusChange(article, newStatus)
            }
        } catch (error) {
            console.error("Error updating article status:", error)
        } finally {
            setIsUpdating(false)
        }
    }

  return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-md overflow-y-auto p-4 sm:p-6">
                <SheetHeader className="pb-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">
                            {article?.code_produit}
                        </Badge>
                        {article?.famille && (
                            <Badge variant="secondary">
                                {article.famille}
                            </Badge>
                        )}
                    </div>
                    <SheetTitle className="text-xl font-bold leading-tight">
                        {article?.nom_produit}
                    </SheetTitle>
                    <SheetDescription>
                        Détails complets de l&apos;article et informations de stock.
                    </SheetDescription>
                    <div className="flex items-center justify-between pt-4 border-t mt-4">
                        <div className="flex flex-col gap-0.5">
                            <Label className="text-sm font-medium">Statut de l&apos;article</Label>
                            <p className="text-xs text-muted-foreground">
                                {article?.en_sommeil ? "Désactivé (En sommeil)" : "Activé (En vente)"}
                            </p>
                        </div>
                        <Switch
                            checked={!article?.en_sommeil}
                            onCheckedChange={handleToggleStatus}
                            disabled={isUpdating}
                        />
                    </div>
                </SheetHeader>

                <Separator />

                <div className="grid gap-5 py-4 sm:py-6 px-0 sm:px-1">
                    {/* General Info */}
                    <div className="flex flex-col gap-4">
                        <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground/70 uppercase tracking-wider">
                            <HugeiconsIcon icon={InformationCircleIcon} />
                            Informations Générales
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1">
                                <p className="text-xs text-muted-foreground uppercase">Référence</p>
                                <p className="font-medium">{article?.code_produit}</p>
                            </div>
                            <div className="flex flex-col gap-1">
                                <p className="text-xs text-muted-foreground uppercase">Famille</p>
                                <p className="font-medium">{article?.famille || "-"}</p>
                            </div>
                            <div className="col-span-2 flex flex-col gap-1">
                                <p className="text-xs text-muted-foreground uppercase">Désignation Complémentaire</p>
                                <p className="font-medium">{article?.description_produit || "-"}</p>
                            </div>
                            <div className="flex flex-col gap-1">
                                <p className="text-xs text-muted-foreground uppercase">Code Barre</p>
                                <div className="flex items-center gap-2">
                                    <HugeiconsIcon icon={BarCode02Icon} className="size-4 text-muted-foreground" />
                                    <p className="font-medium font-mono">{article?.code_barre_ean || "-"}</p>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <p className="text-xs text-muted-foreground uppercase">Unité de mesure</p>
                                <p className="font-medium">{article?.unite_mesure || "Unité"}</p>
                            </div>
                        </div>
                    </div>

                    <Separator className="bg-muted/50" />

                    {/* Pricing */}
                    <div className="flex flex-col gap-4">
                        <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground/70 uppercase tracking-wider">
                            <HugeiconsIcon icon={Money01Icon} />
                            Tarification
                        </h3>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-4 bg-muted/30 p-4 rounded-lg">
                            <div className="flex flex-col gap-1">
                                <p className="text-xs text-muted-foreground uppercase">Prix Achat HT</p>
                                <p className="text-lg font-bold text-info">{formatPrice(article?.prix_achat ? Number(article.prix_achat) : 0)}</p>
                            </div>
                            <div className="flex flex-col gap-1">
                                <p className="text-xs text-muted-foreground uppercase">Prix Vente HT</p>
                                <p className="text-lg font-bold text-emerald-600">{formatPrice(article?.prix_vente ? Number(article.prix_vente) : 0)}</p>
                            </div>
                            <div className="flex flex-col gap-1">
                                <p className="text-xs text-muted-foreground uppercase">Coefficient</p>
                                <Badge variant="outline" className="font-mono">{article?.coefficient ? Number(article.coefficient).toFixed(2) : "1.00"}</Badge>
                            </div>
                            <div className="flex flex-col gap-1">
                                <p className="text-xs text-muted-foreground uppercase">TVA %</p>
                                <p className="text-sm font-medium">{article?.taux_tva ? String(article.taux_tva) : "20.0"}</p>
                            </div>
                        </div>
                    </div>

                    <Separator className="bg-muted/50" />

                    {/* Stocks */}
                    <div className="flex flex-col gap-4">
                        <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground/70 uppercase tracking-wider">
                            <HugeiconsIcon icon={PackageIcon} className="size-4" />
                            Gestion des Stocks
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1">
                                <p className="text-xs text-muted-foreground uppercase">Stock Actuel</p>
                                <p className={cn("text-2xl font-bold", article?.stock_global === 0 ? "text-destructive" : "text-primary")}>
                                    {article?.stock_global}
                                </p>
                            </div>
                            <div className="flex flex-col gap-1">
                                <p className="text-xs text-muted-foreground uppercase">Suivi Stock</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className={cn("size-2 rounded-full", article?.activer_suivi_stock ? "bg-emerald-500" : "bg-destructive")} />
                                    <p className="text-sm font-medium">{article?.activer_suivi_stock ? 'Activé' : 'Désactivé'}</p>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <p className="text-xs text-muted-foreground uppercase">Stock Mini</p>
                                <p className="font-medium">{article?.stock_minimum || 0}</p>
                            </div>
                            <div className="flex flex-col gap-1">
                                <p className="text-xs text-muted-foreground uppercase">Stock Maxi</p>
                                <p className="font-medium">{article?.stock_maximum || 0}</p>
                            </div>
                        </div>
                    </div>

                    <Separator className="bg-muted/50" />

                    {/* Audit */}
                    <div className="flex flex-col gap-4">
                        <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground/70 uppercase tracking-wider">
                            <HugeiconsIcon icon={Calendar01Icon} className="size-4" />
                            Audit & Dates
                        </h3>
                        <div className="flex flex-col gap-3 bg-muted/20 p-3 rounded-md text-xs">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Date Création</span>
                                <span className="font-medium">{article?.date_creation ? formatDate(article.date_creation) : "-"}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Dernière Modification</span>
                                <span className="font-medium">{article?.date_modification ? formatDate(article.date_modification) : "-"}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
