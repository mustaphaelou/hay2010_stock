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
            <div className="flex flex-1 flex-col gap-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Niveaux de Stock</h1>
                        <p className="text-muted-foreground">Suivi des quantités en stock par dépôt</p>
                    </div>
                    <Button onClick={fetchData} disabled={loading}>
                        <HugeiconsIcon icon={RefreshIcon} className="mr-2 h-4 w-4" />
                        Actualiser
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Lignes Stock</CardTitle>
                            <HugeiconsIcon icon={PackageIcon} className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stockLevels.length}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Valeur Totale</CardTitle>
                            <HugeiconsIcon icon={Store01Icon} className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatPrice(totalStockValue)}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Dépôts Actifs</CardTitle>
                            <HugeiconsIcon icon={Store01Icon} className="h-4 w-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{depots.length}</div>
                        </CardContent>
                    </Card>
                    <Card className={lowStockCount > 0 ? "bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20" : ""}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Alertes Stock Bas</CardTitle>
                            <HugeiconsIcon icon={AlertCircleIcon} className={`h-4 w-4 ${lowStockCount > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{lowStockCount}</div>
                            <p className="text-xs text-muted-foreground">Quantité ≤ 5</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle>Filtres</CardTitle>
                        <CardDescription>Filtrer par dépôt</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Select value={selectedDepot} onValueChange={(value) => setSelectedDepot(value ?? 'all')}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
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

                {/* Data Table with Pagination */}
                <Card>
                    <CardHeader>
                        <CardTitle>Etat du Stock</CardTitle>
                        <CardDescription>
                            {loading ? 'Chargement...' : `${filteredStock.length} ligne(s) de stock`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {error ? (
                            <div className="text-center py-10">
                                <p className="text-red-500 mb-4">{error}</p>
                                <Button onClick={fetchData} variant="outline">Réessayer</Button>
                            </div>
                        ) : (
                            <DataTable
                                columns={columns}
                                data={filteredStock}
                                searchKey="designation"
                                placeholder="Rechercher par nom ou code produit..."
                                loading={loading}
                                pageSize={10}
                            />
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    )
}
