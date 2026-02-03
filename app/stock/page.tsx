'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { FArtstock, FArticle, FDepot } from '@/lib/supabase/types'
import { AppLayout } from "@/components/app-layout"
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
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { HugeiconsIcon } from "@hugeicons/react"
import {
    RefreshIcon,
    Store01Icon,
    PackageIcon,
    AlertCircleIcon,
} from "@hugeicons/core-free-icons"

import { fetchAllRows } from '@/lib/supabase/utils'
import { DataTable } from "@/components/erp/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { formatPrice } from "@/lib/utils/format"
import { cn } from "@/lib/utils"

type EnhancedArtstock = FArtstock & {
    f_article: Pick<FArticle, 'ar_design' | 'ar_ref' | 'ar_prixach'> | null
    f_depot: Pick<FDepot, 'de_intitule' | 'de_no'> | null
}

const columns: ColumnDef<EnhancedArtstock>[] = [
    {
        accessorKey: "ar_ref",
        header: "Référence",
        cell: ({ row }) => <Badge variant="outline">{row.getValue("ar_ref")}</Badge>,
    },
    {
        accessorKey: "f_article.ar_design",
        id: "designation",
        header: "Désignation",
        cell: ({ row }) => {
            const design = row.original.f_article?.ar_design
            return <div className="max-w-[250px] truncate">{design || '-'}</div>
        },
    },
    {
        accessorKey: "f_depot.de_intitule",
        header: "Dépôt",
        cell: ({ row }) => {
            const depot = row.original.f_depot?.de_intitule
            return depot ? <Badge variant="secondary">{depot}</Badge> : '-'
        },
    },
    {
        accessorKey: "as_qtesto",
        header: () => <div className="text-right">Qté Disponible</div>,
        cell: ({ row }) => {
            const qty = row.getValue("as_qtesto") as number || 0
            const isLowStock = qty <= 5
            return (
                <div className={`text-right font-semibold flex items-center justify-end gap-1 ${isLowStock ? 'text-red-500' : ''}`}>
                    {qty}
                    {isLowStock && (
                        <HugeiconsIcon icon={AlertCircleIcon} className="h-4 w-4 text-red-500" />
                    )}
                </div>
            )
        },
    },
    {
        accessorKey: "as_qteres",
        header: () => <div className="text-right">Qté Réservée</div>,
        cell: ({ row }) => {
            const qty = row.getValue("as_qteres") as number || 0
            return <div className="text-right text-muted-foreground">{qty}</div>
        },
    },
    {
        accessorKey: "as_cmup",
        header: () => <div className="text-right">CMUP</div>,
        cell: ({ row }) => {
            const cmup = row.getValue("as_cmup") as number
            return <div className="text-right">{formatPrice(cmup)}</div>
        },
    },
    {
        id: "value",
        header: () => <div className="text-right">Valeur</div>,
        cell: ({ row }) => {
            const qty = row.original.as_qtesto || 0
            const cmup = row.original.as_cmup || row.original.f_article?.ar_prixach || 0
            const value = qty * cmup
            return <div className="text-right font-semibold text-primary">{formatPrice(value)}</div>
        },
    },
]

export default function StockPage() {
    const [stockLevels, setStockLevels] = useState<EnhancedArtstock[]>([])
    const [depots, setDepots] = useState<FDepot[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedDepot, setSelectedDepot] = useState<string>('all')

    const supabase = createClient()

    const fetchData = async () => {
        setLoading(true)
        setError(null)

        try {
            // Fetch stock levels with product and warehouse info using pagination utility
            const stockQuery = supabase
                .from('f_artstock')
                .select(`
                    *,
                    f_article (ar_design, ar_ref, ar_prixach),
                    f_depot (de_intitule, de_no)
                `)
                .order('as_qtesto', { ascending: true })

            const stockData = await fetchAllRows<EnhancedArtstock>(stockQuery as any)

            // Fetch warehouses for filter
            const { data: depotsData, error: depotError } = await supabase
                .from('f_depot')
                .select('*')
                .eq('de_cloture', false)
                .order('de_intitule')

            if (depotError) throw depotError

            setStockLevels(stockData || [])
            setDepots(depotsData || [])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur lors du chargement des niveaux de stock')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const filteredStock = stockLevels.filter(stock => {
        const matchesDepot = selectedDepot === 'all' ||
            stock.de_no.toString() === selectedDepot

        return matchesDepot
    })

    const totalStockValue = stockLevels.reduce((acc, s) =>
        acc + ((s.as_qtesto || 0) * (s.f_article?.ar_prixach || s.as_cmup || 0)), 0)

    const lowStockCount = stockLevels.filter(s => (s.as_qtesto || 0) <= 5).length

    return (
        <AppLayout title="Stock" breadcrumb="Niveaux de stock">
            <div className="flex flex-1 flex-col gap-8 animate-fade-in-up">
                {/* Header */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight gradient-text">Niveaux de Stock</h1>
                        <p className="text-muted-foreground font-medium">Suivi en temps réel des quantités par dépôt.</p>
                    </div>
                    <Button onClick={fetchData} disabled={loading} size="lg" className="hover-lift shadow-md rounded-xl">
                        <HugeiconsIcon icon={RefreshIcon} className={cn("mr-2 h-5 w-5", loading && "animate-spin")} />
                        Actualiser
                    </Button>
                </div>

                {/* Stats Cards - Staggered */}
                <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4 stagger-children">
                    <Card variant="kpi" className="hover-lift glow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-0">
                            <CardTitle className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">Lignes Stock</CardTitle>
                            <div className="icon-container w-10 h-10 shadow-sm opacity-90">
                                <HugeiconsIcon icon={PackageIcon} className="h-5 w-5 text-primary" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 pt-3">
                            <div className="text-2xl sm:text-3xl font-extrabold animate-count-up">{stockLevels.length}</div>
                            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium mt-1">Nombre d'emplacements</p>
                        </CardContent>
                    </Card>

                    <Card variant="kpi" className="hover-lift glow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-0">
                            <CardTitle className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">Valeur Totale</CardTitle>
                            <div className="icon-container w-10 h-10 shadow-sm opacity-90">
                                <HugeiconsIcon icon={Store01Icon} className="h-5 w-5 text-green-500" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 pt-3">
                            <div className="text-2xl sm:text-3xl font-extrabold text-primary animate-count-up">{formatPrice(totalStockValue)}</div>
                            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium mt-1">Valorisation au CMUP</p>
                        </CardContent>
                    </Card>

                    <Card variant="kpi" className="hover-lift glow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-0">
                            <CardTitle className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">Dépôts</CardTitle>
                            <div className="icon-container w-10 h-10 shadow-sm opacity-90">
                                <HugeiconsIcon icon={Store01Icon} className="h-5 w-5 text-orange-500" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 pt-3">
                            <div className="text-2xl sm:text-3xl font-extrabold animate-count-up">{depots.length}</div>
                            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium mt-1">Entrepôts actifs</p>
                        </CardContent>
                    </Card>

                    <Card variant="kpi" className={cn("hover-lift glow", lowStockCount > 0 && "bg-destructive/5 ring-destructive/20")}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-0">
                            <CardTitle className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">Alertes</CardTitle>
                            <div className={cn("icon-container w-10 h-10 shadow-sm", lowStockCount > 0 ? "bg-destructive/10" : "opacity-90")}>
                                <HugeiconsIcon icon={AlertCircleIcon} className={cn("h-5 w-5", lowStockCount > 0 ? "text-destructive" : "text-muted-foreground")} />
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 pt-3">
                            <div className={cn("text-2xl sm:text-3xl font-extrabold animate-count-up", lowStockCount > 0 && "text-destructive")}>{lowStockCount}</div>
                            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium mt-1">Qté ≤ 5 unités</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters & Content Row */}
                <div className="grid gap-6 lg:grid-cols-4 items-start">
                    {/* Filter Sidebar on desktop, top on mobile */}
                    <Card className="lg:col-span-1 shadow-sm border-muted/40 sticky top-20">
                        <CardHeader className="pb-4 border-b bg-muted/20">
                            <CardTitle className="text-lg font-bold">Filtrer par Dépôt</CardTitle>
                            <CardDescription>Affiner la vue par localisation.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <Select value={selectedDepot} onValueChange={(value) => setSelectedDepot(value ?? 'all')}>
                                <SelectTrigger className="w-full h-11 rounded-xl shadow-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="all">Tous les dépôts</SelectItem>
                                    {depots.map(d => (
                                        <SelectItem key={d.de_no} value={d.de_no.toString()}>
                                            {d.de_intitule}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </CardContent>
                    </Card>

                    {/* Table Content */}
                    <Card className="lg:col-span-3 overflow-hidden shadow-sm border-muted/40 transition-all hover:shadow-md">
                        <CardHeader className="pb-4 bg-muted/20 border-b">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-xl font-bold">Etat détaillé du Stock</CardTitle>
                                    <CardDescription>
                                        {loading ? 'Chargement des données...' : `${filteredStock.length} ligne(s) trouvée(s)`}
                                    </CardDescription>
                                </div>
                                <div className="p-2 rounded-lg bg-background border shadow-xs">
                                    <HugeiconsIcon icon={PackageIcon} className="h-5 w-5 text-primary" />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 sm:p-2">
                            {error ? (
                                <div className="text-center py-16 px-4">
                                    <HugeiconsIcon icon={AlertCircleIcon} className="mx-auto h-12 w-12 text-destructive/50 mb-4" />
                                    <p className="text-destructive font-semibold mb-6">{error}</p>
                                    <Button onClick={fetchData} variant="outline" size="lg" className="rounded-xl">Réessayer</Button>
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
        </AppLayout>
    )
}
