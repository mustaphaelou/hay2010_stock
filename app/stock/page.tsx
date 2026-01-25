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
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { HugeiconsIcon } from "@hugeicons/react"
import {
    Search01Icon,
    RefreshIcon,
    Store01Icon,
    PackageIcon,
    AlertCircleIcon,
} from "@hugeicons/core-free-icons"

type EnhancedArtstock = FArtstock & {
    f_article: Pick<FArticle, 'ar_design' | 'ar_ref' | 'ar_prixach'> | null
    f_depot: Pick<FDepot, 'de_intitule' | 'de_no'> | null
}

const formatPrice = (price: number | null | undefined) => {
    if (price === null || price === undefined) return '-'
    return new Intl.NumberFormat('fr-MA', {
        style: 'currency',
        currency: 'MAD',
        minimumFractionDigits: 2
    }).format(price).replace('MAD', 'Dhs')
}

export default function StockPage() {
    const [stockLevels, setStockLevels] = useState<EnhancedArtstock[]>([])
    const [depots, setDepots] = useState<FDepot[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedDepot, setSelectedDepot] = useState<string>('all')

    const supabase = createClient()

    const fetchData = async () => {
        setLoading(true)
        setError(null)

        try {
            // Fetch stock levels with product and warehouse info
            const { data: stockData, error: stockError } = await supabase
                .from('f_artstock')
                .select(`
                    *,
                    f_article (ar_design, ar_ref, ar_prixach),
                    f_depot (de_intitule, de_no)
                `)
                .order('as_qtesto', { ascending: true })

            if (stockError) throw stockError

            // Fetch warehouses for filter
            const { data: depotsData, error: depotError } = await supabase
                .from('f_depot')
                .select('*')
                .eq('de_cloture', false)
                .order('de_intitule')

            if (depotError) throw depotError

            setStockLevels(stockData as EnhancedArtstock[] || [])
            setDepots(depotsData || [])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur lors du chargement des niveaux de stock')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const filteredStock = stockLevels.filter(stock => {
        const matchesSearch = searchTerm === '' ||
            stock.f_article?.ar_design?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            stock.f_article?.ar_ref?.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesDepot = selectedDepot === 'all' ||
            stock.de_no.toString() === selectedDepot

        return matchesSearch && matchesDepot
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
                        <CardDescription>Rechercher par produit ou dépôt</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-4 md:flex-row">
                            <div className="relative flex-1">
                                <HugeiconsIcon icon={Search01Icon} className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Rechercher par nom ou code produit..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
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
                        </div>
                    </CardContent>
                </Card>

                {/* Data Table */}
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
                        ) : loading ? (
                            <div className="flex items-center justify-center py-10">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                        ) : filteredStock.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                                <HugeiconsIcon icon={PackageIcon} className="h-12 w-12 text-muted-foreground mb-4" />
                                <p className="text-muted-foreground">Aucun stock trouvé</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Référence</TableHead>
                                            <TableHead>Désignation</TableHead>
                                            <TableHead>Dépôt</TableHead>
                                            <TableHead className="text-right">Qté Disponible</TableHead>
                                            <TableHead className="text-right">Qté Réservée</TableHead>
                                            <TableHead className="text-right">CMUP</TableHead>
                                            <TableHead className="text-right">Valeur</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredStock.slice(0, 50).map((stock, index) => {
                                            const value = (stock.as_qtesto || 0) * (stock.as_cmup || stock.f_article?.ar_prixach || 0)
                                            const isLowStock = (stock.as_qtesto || 0) <= 5
                                            return (
                                                <TableRow
                                                    key={`${stock.ar_ref}-${stock.de_no}-${index}`}
                                                    className={`hover:bg-muted/50 transition-colors ${isLowStock ? 'bg-red-500/5' : ''}`}
                                                >
                                                    <TableCell className="font-medium">
                                                        <Badge variant="outline">{stock.ar_ref}</Badge>
                                                    </TableCell>
                                                    <TableCell className="max-w-[250px] truncate">
                                                        {stock.f_article?.ar_design || '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary">{stock.f_depot?.de_intitule}</Badge>
                                                    </TableCell>
                                                    <TableCell className={`text-right font-semibold ${isLowStock ? 'text-red-500' : ''}`}>
                                                        {stock.as_qtesto || 0}
                                                        {isLowStock && (
                                                            <HugeiconsIcon icon={AlertCircleIcon} className="inline-block ml-1 h-4 w-4 text-red-500" />
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right text-muted-foreground">
                                                        {stock.as_qteres || 0}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {formatPrice(stock.as_cmup)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold text-primary">
                                                        {formatPrice(value)}
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                                {filteredStock.length > 50 && (
                                    <p className="text-center text-sm text-muted-foreground mt-4">
                                        Affichage des 50 premiers résultats sur {filteredStock.length}
                                    </p>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    )
}
