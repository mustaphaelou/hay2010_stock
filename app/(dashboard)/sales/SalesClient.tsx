'use client'

import { useState, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
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
import { SafeIcon as HugeiconsIcon } from "@/components/ui/safe-icon"
import {
  Search01Icon,
  FilterIcon,
  Invoice01Icon,
  RefreshIcon,
  SaleTag01Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Empty } from "@/components/ui/empty"

import { getSalesDocuments } from '@/app/actions/documents'
import { formatPrice, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

import type { DocumentWithComputed } from '@/lib/types'
type DocumentItem = DocumentWithComputed

interface SalesClientProps {
  initialData: DocumentItem[]
  initialError: string | null
}

export default function SalesClient({ initialData, initialError }: SalesClientProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(initialError)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getSalesDocuments()
      if (result.error) {
        setError(result.error)
        setDocuments([])
      } else {
        setDocuments(result.data || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  const uniqueTypes = useMemo(() => {
    const types = new Set(documents.map(d => d.type_document))
    return Array.from(types).sort()
  }, [documents])

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

  const stats = useMemo(() => {
    const totalVentes = documents.reduce((acc, d) => acc + (Number(d.montant_ttc) || 0), 0)
    const totalHT = documents.reduce((acc, d) => acc + (Number(d.montant_ht) || 0), 0)
    const regleCount = documents.filter(d => {
      const ttc = Number(d.montant_ttc)
      const regle = Number(d.montant_regle)
      return ttc > 0 && regle >= ttc
    }).length
    const encoursCount = documents.filter(d => {
      const ttc = Number(d.montant_ttc)
      const regle = Number(d.montant_regle)
      return ttc > 0 && regle < ttc
    }).length
    const impayeTotal = documents.reduce((acc, d) => {
      const ttc = Number(d.montant_ttc)
      const regle = Number(d.montant_regle)
      return acc + (regle < ttc ? ttc - regle : 0)
    }, 0)
    return { totalVentes, totalHT, regleCount, encoursCount, impayeTotal, docCount: documents.length }
  }, [documents])

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0 pb-20 md:gap-8 md:p-8 md:pb-8 animate-fade-in-up">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight gradient-text">Ventes</h1>
          <p className="text-sm text-muted-foreground">Gestion des documents commerciaux côté vente</p>
        </div>
        <Button onClick={fetchData} disabled={loading} size="lg">
          <HugeiconsIcon icon={RefreshIcon} className={cn("size-5", loading && "animate-spin")} data-icon="inline-start" />
          Actualiser
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 stagger-children">
        <Card variant="kpi" className="hover-lift glow">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">CA TTC</CardTitle>
            <div className="icon-container">
              <HugeiconsIcon icon={Invoice01Icon} className="text-success" />
            </div>
          </CardHeader>
          <CardContent className="p-0 pt-3">
            <div className="text-xl font-extrabold animate-count-up">{formatPrice(stats.totalVentes)}</div>
            <p className="text-xs text-muted-foreground font-medium mt-1">{stats.docCount} documents</p>
          </CardContent>
        </Card>

        <Card variant="kpi" className="hover-lift glow">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Réglés</CardTitle>
            <div className="icon-container">
              <HugeiconsIcon icon={SaleTag01Icon} className="text-success" />
            </div>
          </CardHeader>
          <CardContent className="p-0 pt-3">
            <div className="text-2xl font-extrabold animate-count-up">{stats.regleCount}</div>
            <p className="text-xs text-muted-foreground font-medium mt-1">Factures soldées</p>
          </CardContent>
        </Card>

        <Card variant="kpi" className={cn("hover-lift glow", stats.encoursCount > 0 && "ring-warning/30")}>
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1">
            <CardTitle className={cn("text-xs font-semibold uppercase tracking-wider", stats.encoursCount > 0 ? "text-warning" : "text-muted-foreground")}>En Cours</CardTitle>
            <div className={cn("icon-container", stats.encoursCount > 0 && "bg-warning/10")}>
              <HugeiconsIcon icon={FilterIcon} className={stats.encoursCount > 0 ? "text-warning" : "text-muted-foreground"} />
            </div>
          </CardHeader>
          <CardContent className="p-0 pt-3">
            <div className={cn("text-2xl font-extrabold animate-count-up", stats.encoursCount > 0 && "text-warning")}>{stats.encoursCount}</div>
            <p className="text-xs text-muted-foreground font-medium mt-1">Non soldées</p>
          </CardContent>
        </Card>

        <Card variant="kpi" className={cn("hover-lift glow", stats.impayeTotal > 0 && "bg-destructive/5")}>
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1">
            <CardTitle className={cn("text-xs font-semibold uppercase tracking-wider", stats.impayeTotal > 0 ? "text-destructive" : "text-muted-foreground")}>Impayés</CardTitle>
            <div className="icon-container">
              <HugeiconsIcon icon={SaleTag01Icon} className={stats.impayeTotal > 0 ? "text-destructive" : "text-muted-foreground"} />
            </div>
          </CardHeader>
          <CardContent className="p-0 pt-3">
            <div className={cn("text-xl font-extrabold animate-count-up", stats.impayeTotal > 0 && "text-destructive")}>{formatPrice(stats.impayeTotal)}</div>
            <p className="text-xs text-muted-foreground font-medium mt-1">Montant restant dû</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b bg-muted/20">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={FilterIcon} className="size-5 text-primary" />
              <div>
                <CardTitle className="text-base font-bold">Liste des Ventes</CardTitle>
                <CardDescription className="text-xs">{filteredDocuments.length} document(s)</CardDescription>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
              <div className="relative w-full sm:w-64">
                <HugeiconsIcon icon={Search01Icon} className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher (N° Pièce, Client...)"
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value ?? 'all')}>
                <SelectTrigger className="w-full sm:w-44">
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
          ) : filteredDocuments.length === 0 ? (
            <div className="p-6">
              <Empty
                title="Aucune vente trouvée"
                description="Essayez de modifier vos critères de recherche."
                icon={Invoice01Icon}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[120px] font-semibold uppercase tracking-wider text-xs">Date</TableHead>
                    <TableHead className="font-semibold uppercase tracking-wider text-xs">N° Pièce</TableHead>
                    <TableHead className="font-semibold uppercase tracking-wider text-xs">Type</TableHead>
                    <TableHead className="font-semibold uppercase tracking-wider text-xs">Client</TableHead>
                    <TableHead className="font-semibold uppercase tracking-wider text-xs mobile-hide">Affaire</TableHead>
                    <TableHead className="text-right font-semibold uppercase tracking-wider text-xs">HT</TableHead>
                    <TableHead className="text-right font-semibold uppercase tracking-wider text-xs">TTC</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={doc.id_document} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">{formatDate(doc.date_document)}</TableCell>
                      <TableCell>{doc.numero_document}</TableCell>
                      <TableCell><Badge variant="outline">{doc.type_document}</Badge></TableCell>
                      <TableCell className="max-w-[200px] truncate" title={doc.partenaire?.nom_partenaire || doc.nom_partenaire_snapshot || ''}>
                        {doc.partenaire?.nom_partenaire || doc.nom_partenaire_snapshot || '-'}
                      </TableCell>
                      <TableCell className="mobile-hide">{doc.numero_affaire || '-'}</TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">{formatPrice(Number(doc.montant_ht))}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{formatPrice(Number(doc.montant_ttc))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
