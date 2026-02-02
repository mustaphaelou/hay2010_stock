'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { FDocentete, FComptet } from '@/lib/supabase/types'
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/erp/app-sidebar"
import { SiteHeader } from "@/components/erp/site-header"
import { BottomNav } from "@/components/erp/bottom-nav"
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
import { HugeiconsIcon } from "@hugeicons/react"
import {
    Search01Icon,
    RefreshIcon,
    Invoice01Icon,
    CheckmarkCircle01Icon,
} from "@hugeicons/core-free-icons"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import { fetchAllRows } from '@/lib/supabase/utils'
import { DocumentDetailSheet } from '@/components/erp/document-detail-sheet'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { PartnerFilter } from '@/components/erp/partner-filter'
import { DateRange } from 'react-day-picker'
import { isWithinInterval, startOfDay, endOfDay } from 'date-fns'
import { DocumentTypeSelector } from '@/components/erp/document-type-selector'

type SalesDocument = FDocentete & { f_comptet: Pick<FComptet, 'ct_intitule' | 'ct_type'> | null }

const formatPrice = (price: number | null | undefined) => {
    if (price === null || price === undefined) return '-'
    return new Intl.NumberFormat('fr-MA', {
        style: 'currency',
        currency: 'MAD',
        minimumFractionDigits: 2
    }).format(price).replace('MAD', 'Dhs')
}

const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    })
}

const getDocumentTypeName = (type: number) => {
    switch (type) {
        case 0: return 'DEVIS'
        case 1: return 'BON COMMANDE'
        case 2: return 'PRÉPARATION LIVRAISON'
        case 3: return 'BON LIVRAISON'
        case 4: return 'BON RETOUR'
        case 5: return 'BON D\'AVOIR'
        case 6: return 'FACTURE'
        case 7: return 'FACTURE COMPTABILISÉE'
        case 8: return 'ARCHIVE'
        default: return `TYPE ${type}`
    }
}
import { Suspense } from "react"

export default function SalesPage() {
    const [documents, setDocuments] = useState<SalesDocument[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedDocument, setSelectedDocument] = useState<SalesDocument | null>(null)
    const [sheetOpen, setSheetOpen] = useState(false)
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
    const [selectedClient, setSelectedClient] = useState<string>('all')
    const [selectedPartnerType, setSelectedPartnerType] = useState<string>('all')
    const [selectedType, setSelectedType] = useState<string | number>('all')
    const [mounted, setMounted] = useState(false)

    const supabase = createClient()

    const fetchDocuments = async () => {
        setLoading(true)
        setError(null)

        try {
            const query = supabase
                .from('f_docentete')
                .select(`*, f_comptet (ct_intitule, ct_type)`)
                .eq('do_domaine', 0) // Sales domain
                .order('do_date', { ascending: false })

            const data = await fetchAllRows<SalesDocument>(query as any)
            setDocuments(data || [])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        setMounted(true)
        fetchDocuments()
    }, [])

    const uniqueClients = Array.from(new Set(documents.map(doc =>
        doc.f_comptet?.ct_intitule || doc.do_tiers
    ).filter(Boolean))).sort() as string[]

    const filteredDocuments = documents.filter(doc => {
        const matchesSearch = searchTerm === '' ||
            doc.do_piece?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.do_tiers?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.f_comptet?.ct_intitule?.toLowerCase().includes(searchTerm.toLowerCase())

        let matchesDate = true
        if (dateRange?.from) {
            const docDate = new Date(doc.do_date)
            const start = startOfDay(dateRange.from)
            const end = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from)
            matchesDate = isWithinInterval(docDate, { start, end })
        }

        const clientName = doc.f_comptet?.ct_intitule || doc.do_tiers
        const matchesClient = selectedClient === 'all' || clientName === selectedClient

        const matchesPartnerType = selectedPartnerType === 'all' ||
            (doc.f_comptet && doc.f_comptet.ct_type.toString() === selectedPartnerType)

        let matchesType = true
        if (selectedType === 'en_cours') {
            matchesType = doc.do_statut !== 2 // Example logic for "en cours"
        } else if (selectedType !== 'all') {
            matchesType = doc.do_type === selectedType
        }

        return matchesSearch && matchesDate && matchesClient && matchesPartnerType && matchesType
    })

    const documentTypeCounts = documents.reduce((acc, doc) => {
        const type = doc.do_type
        acc[type] = (acc[type] || 0) + 1
        return acc
    }, {} as Record<number, number>)

    const salesTypes = [
        { id: 'en_cours', label: 'Documents en cours', count: documents.filter(d => d.do_statut !== 2).length },
        { id: 0, label: 'Devis', count: documentTypeCounts[0] || 0 },
        { id: 1, label: 'Bon de commande', count: documentTypeCounts[1] || 0 },
        { id: 2, label: 'Préparation de livraison', count: documentTypeCounts[2] || 0 },
        { id: 3, label: 'Bon de livraison', count: documentTypeCounts[3] || 0 },
        { id: 4, label: 'Bon de retour', count: documentTypeCounts[4] || 0 },
        { id: 5, label: 'Bon d\'avoir', count: documentTypeCounts[5] || 0 },
        { id: 6, label: 'Facture', count: documentTypeCounts[6] || 0 },
        { id: 7, label: 'Facture comptabilisée', count: documentTypeCounts[7] || 0 },
        { id: 8, label: 'Archive', count: documentTypeCounts[8] || 0 },
    ]

    const totalCA = filteredDocuments
        .filter(d => d.do_type === 6 || d.do_type === 7)
        .reduce((acc, d) => acc + (d.do_totalttc || 0), 0)

    const totalRegle = filteredDocuments
        .filter(d => d.do_type === 6 || d.do_type === 7)
        .reduce((acc, d) => acc + (d.do_montregl || 0), 0)

    const getStatusBadge = (doc: SalesDocument) => {
        const isPaid = doc.do_montregl && doc.do_totalttc && doc.do_montregl >= doc.do_totalttc
        const isPartial = doc.do_montregl && doc.do_totalttc && doc.do_montregl > 0 && doc.do_montregl < doc.do_totalttc

        if (isPaid) {
            return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                <HugeiconsIcon icon={CheckmarkCircle01Icon} className="h-3 w-3 mr-1" />
                RÉGLÉ
            </Badge>
        }
        if (isPartial) {
            return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/30">PARTIEL</Badge>
        }
        return <Badge variant="secondary">EN COURS</Badge>
    }

    return (
        <SidebarProvider
            style={{ "--sidebar-width": "280px", "--header-height": "3.5rem" } as React.CSSProperties}
        >
            <Suspense fallback={<div className="hidden md:block w-[--sidebar-width] bg-sidebar border-r h-svh" />}>
                <AppSidebar />
            </Suspense>
            <SidebarInset>
                <SiteHeader />
                <div className="flex flex-1 overflow-hidden">
                    <DocumentTypeSelector
                        types={salesTypes}
                        selectedType={selectedType}
                        onTypeChange={setSelectedType}
                        className="hidden lg:flex"
                    />
                    <div className="flex-1 flex flex-col gap-6 p-4 pb-20 md:p-8 md:pb-8 overflow-y-auto">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">Ventes</h1>
                                <p className="text-muted-foreground">Gestion des documents de vente</p>
                            </div>
                            <Button onClick={fetchDocuments} disabled={loading}>
                                <HugeiconsIcon icon={RefreshIcon} className="mr-2 h-4 w-4" />
                                Actualiser
                            </Button>
                        </div>

                        {/* Stats */}
                        <div className="grid gap-4 md:grid-cols-4">
                            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Documents</CardTitle>
                                    <HugeiconsIcon icon={Invoice01Icon} className="h-4 w-4 text-primary" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{documents.length}</div>
                                </CardContent>
                            </Card>
                            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">CA Total</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{mounted ? formatPrice(totalCA) : '...'}</div>
                                </CardContent>
                            </Card>
                            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Encaissé</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{mounted ? formatPrice(totalRegle) : '...'}</div>
                                </CardContent>
                            </Card>
                            <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Restant Dû</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{mounted ? formatPrice(totalCA - totalRegle) : '...'}</div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Search */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="relative">
                                <HugeiconsIcon icon={Search01Icon} className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Rechercher par numéro..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 h-10"
                                />
                            </div>
                            <DateRangePicker
                                date={dateRange}
                                onDateChange={setDateRange}
                            />
                            <PartnerFilter
                                partners={uniqueClients}
                                selectedPartner={selectedClient}
                                onPartnerChange={setSelectedClient}
                                selectedType={selectedPartnerType}
                                onTypeChange={setSelectedPartnerType}
                            />
                        </div>

                        {/* Table */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Documents de Vente</CardTitle>
                                <CardDescription>
                                    {loading ? 'Chargement...' : `${filteredDocuments.length} document(s)`}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {error ? (
                                    <div className="text-center py-10">
                                        <p className="text-red-500 mb-4">{error}</p>
                                        <Button onClick={fetchDocuments} variant="outline">Réessayer</Button>
                                    </div>
                                ) : loading ? (
                                    <div className="flex items-center justify-center py-10">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>N° Pièce</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Client</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead className="text-right">Montant TTC</TableHead>
                                                <TableHead className="text-right">Réglé</TableHead>
                                                <TableHead className="text-right">Statut</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredDocuments.map((doc) => (
                                                <TableRow
                                                    key={doc.cbmarq}
                                                    className="hover:bg-muted/50 cursor-pointer"
                                                    onClick={() => {
                                                        setSelectedDocument(doc)
                                                        setSheetOpen(true)
                                                    }}
                                                >
                                                    <TableCell>
                                                        <Badge variant="outline">{doc.do_piece}</Badge>
                                                    </TableCell>
                                                    <TableCell>{mounted ? formatDate(doc.do_date) : '-'}</TableCell>
                                                    <TableCell className="font-medium">
                                                        {doc.f_comptet?.ct_intitule || doc.do_tiers || '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary">{getDocumentTypeName(doc.do_type)}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold">
                                                        {mounted ? formatPrice(doc.do_totalttc) : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {mounted ? formatPrice(doc.do_montregl) : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {getStatusBadge(doc)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
                <BottomNav />
            </SidebarInset>
            <DocumentDetailSheet
                document={selectedDocument}
                open={sheetOpen}
                onOpenChange={setSheetOpen}
            />
        </SidebarProvider>
    )
}
