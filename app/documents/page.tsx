'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { FDocentete, FComptet } from '@/lib/supabase/types'
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
    Invoice01Icon,
    File01Icon,
    CheckmarkCircle01Icon,
    Cancel01Icon,
} from "@hugeicons/core-free-icons"

type DocumentWithPartner = FDocentete & { f_comptet: Pick<FComptet, 'ct_intitule'> | null }

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

// Map do_type to document type names
const getDocumentTypeName = (domaine: number, type: number) => {
    if (domaine === 0) { // Ventes
        switch (type) {
            case 0: return 'DEVIS'
            case 1: return 'BON COMMANDE'
            case 3: return 'BON LIVRAISON'
            case 6: return 'FACTURE'
            case 7: return 'AVOIR'
            default: return `TYPE ${type}`
        }
    } else { // Achats
        switch (type) {
            case 0: return 'DEMANDE ACHAT'
            case 1: return 'BON COMMANDE'
            case 3: return 'BON RECEPTION'
            case 6: return 'FACTURE'
            case 7: return 'AVOIR'
            default: return `TYPE ${type}`
        }
    }
}

export default function DocumentsPage() {
    const [documents, setDocuments] = useState<DocumentWithPartner[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedDomaine, setSelectedDomaine] = useState<string>('all')

    const supabase = createClient()

    const fetchDocuments = async () => {
        setLoading(true)
        setError(null)

        try {
            const { data, error } = await supabase
                .from('f_docentete')
                .select(`
                    *,
                    f_comptet (ct_intitule)
                `)
                .order('do_date', { ascending: false })

            if (error) throw error
            setDocuments(data as DocumentWithPartner[] || [])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur lors du chargement des documents')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchDocuments()
    }, [])

    const filteredDocuments = documents.filter(doc => {
        const matchesSearch = searchTerm === '' ||
            doc.do_piece?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.do_tiers?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.f_comptet?.ct_intitule?.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesDomaine = selectedDomaine === 'all' || doc.do_domaine.toString() === selectedDomaine

        return matchesSearch && matchesDomaine
    })

    const getTypeBadgeVariant = (type: number) => {
        switch (type) {
            case 6: return 'default' // Facture
            case 0: return 'secondary' // Devis
            case 1: return 'outline' // Commande
            case 3: return 'outline' // Livraison
            case 7: return 'destructive' // Avoir
            default: return 'outline'
        }
    }

    const getStatusBadge = (statut: number, montRegl: number | null, totalTTC: number | null) => {
        const isPaid = montRegl && totalTTC && montRegl >= totalTTC
        const isPartial = montRegl && totalTTC && montRegl > 0 && montRegl < totalTTC

        if (statut === 2 || isPaid) {
            return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                <HugeiconsIcon icon={CheckmarkCircle01Icon} className="h-3 w-3 mr-1" />
                RÉGLÉ
            </Badge>
        }
        if (isPartial) {
            return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/30">
                PARTIEL
            </Badge>
        }
        if (statut === 0) {
            return <Badge variant="outline">BROUILLON</Badge>
        }
        return <Badge variant="secondary">EN COURS</Badge>
    }

    const totalCA = documents
        .filter(d => d.do_domaine === 0 && d.do_type === 6) // Sales invoices
        .reduce((acc, d) => acc + (d.do_totalttc || 0), 0)

    const totalAchats = documents
        .filter(d => d.do_domaine === 1 && d.do_type === 6) // Purchase invoices
        .reduce((acc, d) => acc + (d.do_totalttc || 0), 0)

    return (
        <AppLayout title="Documents" breadcrumb="Documents commerciaux">
            <div className="flex flex-1 flex-col gap-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
                        <p className="text-muted-foreground">Gestion des documents commerciaux</p>
                    </div>
                    <Button onClick={fetchDocuments} disabled={loading}>
                        <HugeiconsIcon icon={RefreshIcon} className="mr-2 h-4 w-4" />
                        Actualiser
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
                            <HugeiconsIcon icon={File01Icon} className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{documents.length}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">CA Ventes</CardTitle>
                            <HugeiconsIcon icon={Invoice01Icon} className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatPrice(totalCA)}</div>
                            <p className="text-xs text-muted-foreground">Total factures ventes</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Achats</CardTitle>
                            <HugeiconsIcon icon={Invoice01Icon} className="h-4 w-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatPrice(totalAchats)}</div>
                            <p className="text-xs text-muted-foreground">Total factures achats</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Filtrés</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{filteredDocuments.length}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle>Filtres</CardTitle>
                        <CardDescription>Rechercher par numéro ou partenaire</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-4 md:flex-row">
                            <div className="relative flex-1">
                                <HugeiconsIcon icon={Search01Icon} className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Rechercher par numéro ou partenaire..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <Select value={selectedDomaine} onValueChange={(value) => setSelectedDomaine(value ?? 'all')}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous les domaines</SelectItem>
                                    <SelectItem value="0">Ventes</SelectItem>
                                    <SelectItem value="1">Achats</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Data Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Liste des Documents</CardTitle>
                        <CardDescription>
                            {loading ? 'Chargement...' : `${filteredDocuments.length} document(s) trouvé(s)`}
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
                        ) : filteredDocuments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                                <HugeiconsIcon icon={File01Icon} className="h-12 w-12 text-muted-foreground mb-4" />
                                <p className="text-muted-foreground">Aucun document trouvé</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>N° Pièce</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Tiers</TableHead>
                                            <TableHead>Domaine</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead className="text-right">Montant TTC</TableHead>
                                            <TableHead className="text-right">Statut</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredDocuments.slice(0, 50).map((doc) => (
                                            <TableRow key={doc.cbmarq} className="hover:bg-muted/50 transition-colors">
                                                <TableCell className="font-medium">
                                                    <Badge variant="outline">{doc.do_piece}</Badge>
                                                </TableCell>
                                                <TableCell>{formatDate(doc.do_date)}</TableCell>
                                                <TableCell className="font-medium">
                                                    {doc.f_comptet?.ct_intitule || doc.do_tiers || '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={doc.do_domaine === 0 ? 'default' : 'secondary'}>
                                                        {doc.do_domaine === 0 ? 'VENTE' : 'ACHAT'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={getTypeBadgeVariant(doc.do_type)}>
                                                        {getDocumentTypeName(doc.do_domaine, doc.do_type)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-semibold">
                                                    {formatPrice(doc.do_totalttc)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {getStatusBadge(doc.do_statut, doc.do_montregl, doc.do_totalttc)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {filteredDocuments.length > 50 && (
                                    <p className="text-center text-sm text-muted-foreground mt-4">
                                        Affichage des 50 premiers résultats sur {filteredDocuments.length}
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
