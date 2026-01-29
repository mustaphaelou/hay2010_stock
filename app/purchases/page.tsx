'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { FDocentete, FComptet } from '@/lib/supabase/types'
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/erp/app-sidebar"
import { SiteHeader } from "@/components/erp/site-header"
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
    ShoppingBag01Icon,
    CheckmarkCircle01Icon,
} from "@hugeicons/core-free-icons"

import { fetchAllRows } from '@/lib/supabase/utils'

type PurchaseDocument = FDocentete & { f_comptet: Pick<FComptet, 'ct_intitule'> | null }

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
        case 0: return 'DEMANDE ACHAT'
        case 1: return 'BON COMMANDE'
        case 3: return 'BON RECEPTION'
        case 6: return 'FACTURE'
        case 7: return 'AVOIR'
        default: return `TYPE ${type}`
    }
}

export default function PurchasesPage() {
    const [documents, setDocuments] = useState<PurchaseDocument[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')

    const supabase = createClient()

    const fetchDocuments = async () => {
        setLoading(true)
        setError(null)

        try {
            const query = supabase
                .from('f_docentete')
                .select(`*, f_comptet (ct_intitule)`)
                .eq('do_domaine', 1) // Purchases domain
                .order('do_date', { ascending: false })

            const data = await fetchAllRows<PurchaseDocument>(query as any)
            setDocuments(data || [])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchDocuments()
    }, [])

    const filteredDocuments = documents.filter(doc => {
        return searchTerm === '' ||
            doc.do_piece?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.do_tiers?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.f_comptet?.ct_intitule?.toLowerCase().includes(searchTerm.toLowerCase())
    })

    const totalAchats = documents
        .filter(d => d.do_type === 6)
        .reduce((acc, d) => acc + (d.do_totalttc || 0), 0)

    const totalRegle = documents
        .filter(d => d.do_type === 6)
        .reduce((acc, d) => acc + (d.do_montregl || 0), 0)

    const getStatusBadge = (doc: PurchaseDocument) => {
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
            <AppSidebar />
            <SidebarInset>
                <SiteHeader />
                <div className="flex flex-1 flex-col gap-6 p-4 md:p-8">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Achats</h1>
                            <p className="text-muted-foreground">Gestion des documents d'achat</p>
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
                                <HugeiconsIcon icon={ShoppingBag01Icon} className="h-4 w-4 text-primary" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{documents.length}</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Achats</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatPrice(totalAchats)}</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Décaissé</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatPrice(totalRegle)}</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">À Payer</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatPrice(totalAchats - totalRegle)}</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <HugeiconsIcon icon={Search01Icon} className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Rechercher par numéro ou fournisseur..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 max-w-md"
                        />
                    </div>

                    {/* Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Documents d'Achat</CardTitle>
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
                                            <TableHead>Fournisseur</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead className="text-right">Montant TTC</TableHead>
                                            <TableHead className="text-right">Réglé</TableHead>
                                            <TableHead className="text-right">Statut</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredDocuments.map((doc) => (
                                            <TableRow key={doc.cbmarq} className="hover:bg-muted/50">
                                                <TableCell>
                                                    <Badge variant="outline">{doc.do_piece}</Badge>
                                                </TableCell>
                                                <TableCell>{formatDate(doc.do_date)}</TableCell>
                                                <TableCell className="font-medium">
                                                    {doc.f_comptet?.ct_intitule || doc.do_tiers || '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">{getDocumentTypeName(doc.do_type)}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-semibold">
                                                    {formatPrice(doc.do_totalttc)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {formatPrice(doc.do_montregl)}
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
            </SidebarInset>
        </SidebarProvider>
    )
}
