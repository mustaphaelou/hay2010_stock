"use client"

import * as React from "react"
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
import { SafeIcon as HugeiconsIcon } from "@/components/ui/safe-icon"
import { Button } from "@/components/ui/button"
import {
  Invoice01Icon,
  UserIcon,
  Calendar03Icon,
  CheckmarkCircle01Icon,
  Alert01Icon,
} from "@hugeicons/core-free-icons"
import { getDocLines } from "@/app/actions/documents"
import { formatPrice, formatDate } from '@/lib/utils'
import type { DocumentWithComputed, DocumentLine as DocumentLineType } from '@/lib/types'

type DocumentWithPartner = DocumentWithComputed
type DocumentLine = DocumentLineType

interface DocumentDetailSheetProps {
  document: DocumentWithPartner | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const getDocumentTypeName = (domaine: string | null, type: string | null) => {
  const typeStr = String(type)
  if (domaine === 'VENTE') {
    switch (typeStr) {
      case '0': return 'DEVIS'
      case '1': return 'BON COMMANDE'
      case '2': return 'PRÉPARATION LIVRAISON'
      case '3': return 'BON LIVRAISON'
      case '4': return 'BON RETOUR'
      case '5': return 'BON D\'AVOIR'
      case '6': return 'FACTURE'
      case '7': return 'FACTURE COMPTABILISÉE'
      case '8': return 'ARCHIVE'
      default: return `VENTE ${type}`
    }
  } else if (domaine === 'ACHAT') {
    switch (typeStr) {
      case '10': return 'DEMANDE ACHAT'
      case '11': return 'PRÉPARATION CMD'
      case '12': return 'BON COMMANDE'
      case '13': return 'BON RÉCEPTION'
      case '14': return 'BON RETOUR'
      case '15': return 'BON D\'AVOIR'
      case '16': return 'FACTURE'
      case '17': return 'FACTURE COMPTABILISÉE'
      case '18': return 'ARCHIVE'
      default: return `ACHAT ${type}`
    }
  } else if (domaine === 'STOCK') {
    switch (typeStr) {
      case '20': return 'MVT ENTRÉE'
      case '21': return 'MVT SORTIE'
      case '23': return 'VIREMENT'
      case '24': return 'DÉPRÉCIATION'
      default: return `STOCK ${type}`
    }
  }
  return `TYPE ${type}`
}

export function DocumentDetailSheet({ document, open, onOpenChange }: DocumentDetailSheetProps) {
  const [lines, setLines] = React.useState<DocumentLine[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const fetchLines = React.useCallback(async () => {
    if (!document) return
    setLoading(true)
    setError(null)
    try {
      const result = await getDocLines(document.id_document)
      if (result.error) {
        setError(result.error)
        setLines([])
      } else {
        setLines(result.data || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des lignes')
    } finally {
      setLoading(false)
    }
  }, [document])

  React.useEffect(() => {
    if (!document || !open) {
      setLines([])
      setError(null)
      return
    }

    fetchLines()
  }, [document, open, fetchLines])

  if (!document) return null

  const montantTTC = document.montant_ttc_num
  const isPaid = document.montant_regle && montantTTC && document.montant_regle >= montantTTC
  const isPartial = document.montant_regle && montantTTC && document.montant_regle > 0 && document.montant_regle < montantTTC

  const totalHT = Number(document.montant_ht_num || 0)
  const tva = montantTTC - totalHT

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <HugeiconsIcon icon={Invoice01Icon} className="size-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-xl">{document.numero_piece || document.numero_document}</SheetTitle>
              <SheetDescription>
                {getDocumentTypeName(document.domaine_document, document.type_document)}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {/* Document Info */}
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <HugeiconsIcon icon={Calendar03Icon} className="size-3" />
                Date
              </p>
              <p className="font-medium">{formatDate(document.date_document)}</p>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <HugeiconsIcon icon={UserIcon} className="size-3" />
                Tiers
              </p>
              <p className="font-medium">{document.partenaire?.nom_partenaire || document.nom_tiers || document.nom_partenaire_snapshot || '-'}</p>
            </div>
          </div>

          <Separator />

          {/* Totals */}
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total HT</span>
                <span>{formatPrice(totalHT)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">TVA</span>
                <span>{formatPrice(tva)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total TTC</span>
                <span className="text-primary">{formatPrice(montantTTC)}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Réglé</span>
                <span className="text-green-600">{formatPrice(document.montant_regle)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Reste</span>
                <span className="text-orange-600">
                  {formatPrice(montantTTC - (document.montant_regle || 0))}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Statut</span>
                {isPaid ? (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-3 mr-1" />
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
            {error ? (
              <div className="text-center py-6">
                <HugeiconsIcon icon={Alert01Icon} className="mx-auto size-10 text-destructive/50 mb-3" />
                <p className="text-destructive text-sm font-medium mb-3">{error}</p>
                <Button onClick={fetchLines} variant="outline" size="sm">Réessayer</Button>
              </div>
            ) : loading ? (
              <div className="flex flex-col gap-2">
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
                      <TableRow key={line.id_ligne}>
                        <TableCell className="text-xs font-mono">
                          {line.reference_article || '-'}
                        </TableCell>
                        <TableCell className="text-xs max-w-[150px] truncate">
                          {line.designation || '-'}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {line.quantite || 0}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {formatPrice(line.prix_unitaire)}
                        </TableCell>
                        <TableCell className="text-xs text-right font-medium">
                          {formatPrice(line.montant_ttc_num)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Additional Info */}
          {document.reference_externe && (
            <>
              <Separator />
              <div className="py-4">
                <p className="text-xs text-muted-foreground">Référence externe</p>
                <p className="text-sm">{document.reference_externe}</p>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
