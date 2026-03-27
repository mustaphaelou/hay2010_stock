'use client'

import { useState, useEffect, Suspense, useMemo } from 'react'
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/erp/app-sidebar"
import { SiteHeader } from "@/components/erp/site-header"
import { BottomNav } from "@/components/erp/bottom-nav"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { HugeiconsIcon } from "@hugeicons/react"
import {
    Search01Icon,
    FilterIcon,
    Invoice01Icon,
    RefreshIcon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"

import { getSalesDocuments } from '@/app/actions/documents'

import type { DocumentWithComputed } from '@/lib/types'
type DocumentItem = DocumentWithComputed

const formatPrice = (price: number | null | undefined) => {
    if (price === null || price === undefined) return '-'
    return new Intl.NumberFormat('fr-MA', {
        style: 'currency',
        currency: 'MAD',
        minimumFractionDigits: 2
    }).format(price).replace('MAD', 'Dhs')
}

const formatDate = (date: Date | string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    })
}

export default function SalesPage() {
    const [documents, setDocuments] = useState<DocumentItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [typeFilter, setTypeFilter] = useState<string>('all')

    const fetchData = async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await getSalesDocuments()
            setDocuments(data || [])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur réseau')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    // Get unique types from documents
    const uniqueTypes = useMemo(() => {
        const types = new Set(documents.map(d => d.type_document))
        return Array.from(types).sort()
    }, [documents])

    // Filter documents
    const filteredDocuments = useMemo(() => {
        return documents.filter(doc => {
            const matchesSearch = (
                doc.numero_document?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (doc.partenaire?.nom_partenaire || doc.nom_partenaire_snapshot || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (doc.numero_affaire || '').toLowerCase().includes(searchTerm.toLowerCase())
            )
            const matchesType = typeFilter === 'all' || doc.type_document === typeFilter

            return matchesSearch && matchesType
        })
    }, [documents, searchTerm, typeFilter])

    // Stats
    const totalVentes = documents.reduce((acc, d) => acc + (Number(d.montant_ttc) || 0), 0)

    return (
        <SidebarProvider
            style={{ "--sidebar-width": "280px", "--header-height": "3.5rem" } as React.CSSProperties}
        >
            <Suspense fallback={<div className="hidden md:block w-[--sidebar-width] bg-sidebar border-r h-svh" />}>
                <AppSidebar />
            </Suspense>
            <SidebarInset>
                <SiteHeader />
                <div className="flex flex-1 flex-col gap-6 p-4 pb-20 md:p-8 md:pb-8">
                    {/* Header & Stats */}
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Ventes</h1>
                            <p className="text-muted-foreground">Gestion des documents commerciaux côté vente</p>
                        </div>
                        <div className="flex gap-4 w-full md:w-auto">
                            <Card className="w-full md:min-w-[200px] bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-xs font-medium text-green-600 uppercase tracking-wider">Chiffre d&apos;Affaires</CardTitle>
                                    <HugeiconsIcon icon={Invoice01Icon} className="text-emerald-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-emerald-700">{formatPrice(totalVentes)}</div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Filters */}
                    <Card>
                        <CardHeader className="pb-3 border-b border-border/50">
                            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                                <div className="flex items-center gap-2 text-lg font-semibold w-full md:w-auto">
                                    <HugeiconsIcon icon={FilterIcon} className="size-5 text-primary" />
                                    Filtres
                                </div>
                                <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
                                    <div className="relative w-full sm:w-64">
                                        <HugeiconsIcon icon={Search01Icon} className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Rechercher (N° Pièce, Client...)"
                                            className="pl-9 bg-background/50"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value ?? 'all')}>
                                        <SelectTrigger className="w-full sm:w-44 bg-background/50">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectItem value="all">Tous types</SelectItem>
                                                {uniqueTypes.map(type => (
                                                    <SelectItem key={type} value={type || 'unknown'}>{type || 'Inconnu'}</SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                    <Button variant="outline" size="icon" onClick={fetchData} disabled={loading} className="shrink-0 bg-background/50">
                                        <HugeiconsIcon icon={RefreshIcon} className={`size-4 ${loading ? 'animate-spin' : ''}`} />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {error ? (
                                <div className="p-8 text-center text-destructive">
                                    <p className="mb-4">{error}</p>
                                    <Button onClick={fetchData} variant="outline">Réessayer</Button>
                                </div>
                            ) : loading ? (
                                <div className="p-12 flex justify-center">
                                    <div className="animate-spin rounded-full size-8 border-b-2 border-primary"></div>
                                </div>
                            ) : (
                                <div className="rounded-md border-0 overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-muted/30">
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead className="w-[120px] font-semibold">Date</TableHead>
                                                <TableHead className="font-semibold">N° Pièce</TableHead>
                                                <TableHead className="font-semibold">Type</TableHead>
                                                <TableHead className="font-semibold">Client</TableHead>
                                                <TableHead className="font-semibold">Affaire</TableHead>
                                                <TableHead className="text-right font-semibold">Montant HT</TableHead>
                                                <TableHead className="text-right font-semibold">Montant TTC</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredDocuments.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                                        Aucune vente trouvée.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredDocuments.map((doc) => (
                                                    <TableRow key={doc.id_document} className="hover:bg-muted/50 transition-colors">
                                                        <TableCell className="font-medium">{formatDate(doc.date_document)}</TableCell>
                                                        <TableCell>{doc.numero_document}</TableCell>
                                                        <TableCell><Badge variant="outline" className="bg-background">{doc.type_document}</Badge></TableCell>
                                                        <TableCell className="max-w-[200px] truncate" title={doc.partenaire?.nom_partenaire || doc.nom_partenaire_snapshot || ''}>
                                                            {doc.partenaire?.nom_partenaire || doc.nom_partenaire_snapshot || '-'}
                                                        </TableCell>
                                                        <TableCell>{doc.numero_affaire || '-'}</TableCell>
                                                        <TableCell className="text-right text-muted-foreground">{formatPrice(Number(doc.montant_ht))}</TableCell>
                                                        <TableCell className="text-right font-semibold">{formatPrice(Number(doc.montant_ttc))}</TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
                <BottomNav />
            </SidebarInset>
        </SidebarProvider>
    )
}
