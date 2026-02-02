"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import type { FDocentete, FDocligne, FComptet } from "@/lib/supabase/types"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { HugeiconsIcon } from "@hugeicons/react"
import {
    Invoice01Icon,
    UserIcon,
    Calendar03Icon,
    CheckmarkCircle01Icon,
} from "@hugeicons/core-free-icons"

type DocumentWithPartner = FDocentete & { f_comptet?: Pick<FComptet, 'ct_intitule' | 'ct_telephone' | 'ct_email'> | null }
type DocumentLine = FDocligne & { f_article?: { ar_design: string } | null }

interface DocumentDetailSheetProps {
    document: DocumentWithPartner | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

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
            default: return `VENTE ${type}`
        }
    } else if (domaine === 1) {
        switch (type) {
            case 10: return 'DEMANDE ACHAT'
            case 11: return 'PRÉPARATION CMD'
            case 12: return 'BON COMMANDE'
            case 13: return 'BON RÉCEPTION'
            case 14: return 'BON RETOUR'
            case 15: return 'BON D\'AVOIR'
            case 16: return 'FACTURE'
            case 17: return 'FACTURE COMPTABILISÉE'
            case 18: return 'ARCHIVE'
            default: return `ACHAT ${type}`
        }
    } else if (domaine === 2) {
        switch (type) {
            case 20: return 'MVT ENTRÉE'
            case 21: return 'MVT SORTIE'
            case 23: return 'VIREMENT'
            case 24: return 'DÉPRÉCIATION'
            default: return `STOCK ${type}`
        }
    }
    return `TYPE ${type}`
}

export function DocumentDetailSheet({ document, open, onOpenChange }: DocumentDetailSheetProps) {
    const [lines, setLines] = React.useState<DocumentLine[]>([])
    const [loading, setLoading] = React.useState(false)
    const supabase = createClient()

    React.useEffect(() => {
        if (!document || !open) {
            setLines([])
            return
        }

        const fetchLines = async () => {
            setLoading(true)
            try {
                const { data, error } = await supabase
                    .from('f_docligne')
                    .select(`*, f_article (ar_design)`)
                    .eq('do_domaine', document.do_domaine)
                    .eq('do_type', document.do_type)
                    .eq('do_piece', document.do_piece)
                    .order('dl_ligne', { ascending: true })

                if (!error && data) {
                    setLines(data as DocumentLine[])
                }
            } catch (err) {
                console.error('Error fetching document lines:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchLines()
    }, [document, open, supabase])

    if (!document) return null

    const isPaid = document.do_montregl && document.do_totalttc && document.do_montregl >= document.do_totalttc
    const isPartial = document.do_montregl && document.do_totalttc && document.do_montregl > 0 && document.do_montregl < document.do_totalttc

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
                <SheetHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <HugeiconsIcon icon={Invoice01Icon} className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <SheetTitle className="text-xl">{document.do_piece}</SheetTitle>
                            <SheetDescription>
                                {getDocumentTypeName(document.do_domaine, document.do_type)}
                            </SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-4 pb-4">
                    {/* Document Info */}
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <HugeiconsIcon icon={Calendar03Icon} className="h-3 w-3" />
                                Date
                            </p>
                            <p className="font-medium">{formatDate(document.do_date)}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <HugeiconsIcon icon={UserIcon} className="h-3 w-3" />
                                Tiers
                            </p>
                            <p className="font-medium">{document.f_comptet?.ct_intitule || document.do_tiers || '-'}</p>
                        </div>
                    </div>

                    <Separator />

                    {/* Totals */}
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Total HT</span>
                                <span>{formatPrice(document.do_totalht)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">TVA</span>
                                <span>{formatPrice(document.do_tva)}</span>
                            </div>
                            <div className="flex justify-between font-semibold">
                                <span>Total TTC</span>
                                <span className="text-primary">{formatPrice(document.do_totalttc)}</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Réglé</span>
                                <span className="text-green-600">{formatPrice(document.do_montregl)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Reste</span>
                                <span className="text-orange-600">
                                    {formatPrice((document.do_totalttc || 0) - (document.do_montregl || 0))}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Statut</span>
                                {isPaid ? (
                                    <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                                        <HugeiconsIcon icon={CheckmarkCircle01Icon} className="h-3 w-3 mr-1" />
                                        RÉGLÉ
                                    </Badge>
                                ) : isPartial ? (
                                    <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/30">PARTIEL</Badge>
                                ) : (
                                    <Badge variant="secondary">EN COURS</Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Document Lines */}
                    <div className="py-4">
                        <h4 className="font-semibold mb-3">Lignes du document</h4>
                        {loading ? (
                            <div className="space-y-2">
                                {[1, 2, 3].map(i => (
                                    <Skeleton key={i} className="h-12 w-full" />
                                ))}
                            </div>
                        ) : lines.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                Aucune ligne trouvée
                            </p>
                        ) : (
                            <div className="overflow-x-auto -mx-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-xs">Réf.</TableHead>
                                            <TableHead className="text-xs">Désignation</TableHead>
                                            <TableHead className="text-xs text-right">Qté</TableHead>
                                            <TableHead className="text-xs text-right">P.U.</TableHead>
                                            <TableHead className="text-xs text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {lines.map((line) => (
                                            <TableRow key={line.cbmarq}>
                                                <TableCell className="text-xs font-mono">
                                                    {line.ar_ref || '-'}
                                                </TableCell>
                                                <TableCell className="text-xs max-w-[150px] truncate">
                                                    {line.f_article?.ar_design || line.dl_design || '-'}
                                                </TableCell>
                                                <TableCell className="text-xs text-right">
                                                    {line.dl_qte || 0}
                                                </TableCell>
                                                <TableCell className="text-xs text-right">
                                                    {formatPrice(line.dl_prixunitaire)}
                                                </TableCell>
                                                <TableCell className="text-xs text-right font-medium">
                                                    {formatPrice(line.dl_montantttc)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>

                    {/* Additional Info */}
                    {document.do_ref && (
                        <>
                            <Separator />
                            <div className="py-4">
                                <p className="text-xs text-muted-foreground">Référence externe</p>
                                <p className="text-sm">{document.do_ref}</p>
                            </div>
                        </>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}
