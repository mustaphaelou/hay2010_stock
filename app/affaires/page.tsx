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
    RefreshIcon,
    Invoice01Icon,
    ShoppingBag01Icon,
    FolderOpenIcon,
    File01Icon,
} from "@hugeicons/core-free-icons"

type AffaireDocument = FDocentete & { f_comptet: Pick<FComptet, 'ct_intitule'> | null }

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

const getDocumentTypeName = (domaine: number, type: number) => {
    if (domaine === 0) {
        // Ventes
        switch (type) {
            case 0: return 'DEVIS'
            case 1: return 'BON COMMANDE'
            case 3: return 'BON LIVRAISON'
            case 6: return 'FACTURE'
            case 7: return 'AVOIR'
            default: return `VENTE ${type}`
        }
    } else if (domaine === 1) {
        // Achats
        switch (type) {
            case 0: return 'DEMANDE PRIX'
            case 1: return 'BON COMMANDE'
            case 2: return 'BON RECEPTION'
            case 6: return 'FACTURE ACHAT'
            case 7: return 'AVOIR ACHAT'
            default: return `ACHAT ${type}`
        }
    }
    return `TYPE ${type}`
}

const getDomaineBadge = (domaine: number) => {
    if (domaine === 0) {
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">VENTE</Badge>
    }
    return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30">ACHAT</Badge>
}

export default function AffairesPage() {
    const [affaires, setAffaires] = useState<string[]>([])
    const [selectedAffaire, setSelectedAffaire] = useState<string>('')
    const [documents, setDocuments] = useState<AffaireDocument[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingDocs, setLoadingDocs] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const supabase = createClient()

    // Load all distinct affaires
    const fetchAffaires = async () => {
        setLoading(true)
        setError(null)

        try {
            const { data, error } = await supabase
                .from('f_docentete')
                .select('af_affaire')
                .not('af_affaire', 'is', null)
                .order('af_affaire')

            if (error) throw error

            // Get unique affaires
            const uniqueAffaires = [...new Set(data?.map(d => d.af_affaire) || [])] as string[]
            setAffaires(uniqueAffaires)

            // Auto-select first affaire if available
            if (uniqueAffaires.length > 0 && !selectedAffaire) {
                setSelectedAffaire(uniqueAffaires[0])
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
        } finally {
            setLoading(false)
        }
    }

    // Load documents for selected affaire
    const fetchDocuments = async () => {
        if (!selectedAffaire) return

        setLoadingDocs(true)
        setError(null)

        try {
            const { data, error } = await supabase
                .from('f_docentete')
                .select(`*, f_comptet (ct_intitule)`)
                .eq('af_affaire', selectedAffaire)
                .order('do_date', { ascending: false })

            if (error) throw error
            setDocuments(data as AffaireDocument[] || [])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
        } finally {
            setLoadingDocs(false)
        }
    }

    useEffect(() => {
        fetchAffaires()
    }, [])

    useEffect(() => {
        if (selectedAffaire) {
            fetchDocuments()
        }
    }, [selectedAffaire])

    // Calculate stats
    const ventesDocuments = documents.filter(d => d.do_domaine === 0)
    const achatsDocuments = documents.filter(d => d.do_domaine === 1)
    const totalVentes = ventesDocuments.reduce((acc, d) => acc + (d.do_totalttc || 0), 0)
    const totalAchats = achatsDocuments.reduce((acc, d) => acc + (d.do_totalttc || 0), 0)
    const marge = totalVentes - totalAchats

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
                            <h1 className="text-3xl font-bold tracking-tight">Interrogation Affaire</h1>
                            <p className="text-muted-foreground">Mouvements des documents par affaire</p>
                        </div>
                        <Button onClick={fetchDocuments} disabled={loadingDocs || !selectedAffaire}>
                            <HugeiconsIcon icon={RefreshIcon} className="mr-2 h-4 w-4" />
                            Actualiser
                        </Button>
                    </div>

                    {/* Affaire Selector */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <HugeiconsIcon icon={FolderOpenIcon} className="h-5 w-5" />
                                Sélection Affaire
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Select
                                value={selectedAffaire}
                                onValueChange={setSelectedAffaire}
                                disabled={loading}
                            >
                                <SelectTrigger className="w-full max-w-md">
                                    <SelectValue placeholder={loading ? "Chargement..." : "Sélectionner une affaire"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {affaires.map((affaire) => (
                                        <SelectItem key={affaire} value={affaire}>
                                            {affaire}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {affaires.length === 0 && !loading && (
                                <p className="text-sm text-muted-foreground mt-2">
                                    Aucune affaire trouvée dans la base de données.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Stats */}
                    {selectedAffaire && (
                        <div className="grid gap-4 md:grid-cols-4">
                            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Documents</CardTitle>
                                    <HugeiconsIcon icon={File01Icon} className="h-4 w-4 text-primary" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{documents.length}</div>
                                    <p className="text-xs text-muted-foreground">
                                        {ventesDocuments.length} ventes, {achatsDocuments.length} achats
                                    </p>
                                </CardContent>
                            </Card>
                            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total Ventes</CardTitle>
                                    <HugeiconsIcon icon={Invoice01Icon} className="h-4 w-4 text-green-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-green-600">{formatPrice(totalVentes)}</div>
                                </CardContent>
                            </Card>
                            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total Achats</CardTitle>
                                    <HugeiconsIcon icon={ShoppingBag01Icon} className="h-4 w-4 text-blue-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-blue-600">{formatPrice(totalAchats)}</div>
                                </CardContent>
                            </Card>
                            <Card className={`bg-gradient-to-br ${marge >= 0 ? 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20' : 'from-red-500/10 to-red-500/5 border-red-500/20'}`}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Marge</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className={`text-2xl font-bold ${marge >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {formatPrice(marge)}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Documents Table */}
                    {selectedAffaire && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Mouvements - {selectedAffaire}</CardTitle>
                                <CardDescription>
                                    {loadingDocs ? 'Chargement...' : `${documents.length} document(s) trouvé(s)`}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {error ? (
                                    <div className="text-center py-10">
                                        <p className="text-red-500 mb-4">{error}</p>
                                        <Button onClick={fetchDocuments} variant="outline">Réessayer</Button>
                                    </div>
                                ) : loadingDocs ? (
                                    <div className="flex items-center justify-center py-10">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    </div>
                                ) : documents.length === 0 ? (
                                    <div className="text-center py-10 text-muted-foreground">
                                        Aucun document pour cette affaire.
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>N° Pièce</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Domaine</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Tiers</TableHead>
                                                <TableHead className="text-right">Montant HT</TableHead>
                                                <TableHead className="text-right">Montant TTC</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {documents.map((doc) => (
                                                <TableRow key={doc.cbmarq} className="hover:bg-muted/50">
                                                    <TableCell>
                                                        <Badge variant="outline">{doc.do_piece}</Badge>
                                                    </TableCell>
                                                    <TableCell>{formatDate(doc.do_date)}</TableCell>
                                                    <TableCell>{getDomaineBadge(doc.do_domaine)}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary">
                                                            {getDocumentTypeName(doc.do_domaine, doc.do_type)}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {doc.f_comptet?.ct_intitule || doc.do_tiers || '-'}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {formatPrice(doc.do_totalht)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold">
                                                        {formatPrice(doc.do_totalttc)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
