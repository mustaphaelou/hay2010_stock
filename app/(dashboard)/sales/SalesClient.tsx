'use client'

import { useState, useMemo } from 'react'
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
import { SafeIcon as HugeiconsIcon } from "@/components/ui/safe-icon"
import {
  Search01Icon,
  FilterIcon,
  Invoice01Icon,
  RefreshIcon,
  SaleTag01Icon,
  AlertCircleIcon,
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
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedDocIds, setSelectedDocIds] = useState<Set<number>>(new Set())

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
      
      let matchesStatus = true
      if (statusFilter === 'paye') {
        matchesStatus = doc.est_entierement_paye || (Number(doc.solde_du) === 0 && Number(doc.montant_ttc) > 0)
      } else if (statusFilter === 'impaye') {
        matchesStatus = !doc.est_entierement_paye && Number(doc.solde_du) > 0
      } else if (statusFilter === 'brouillon') {
        matchesStatus = doc.statut_document === 'BROUILLON'
      }

      return matchesSearch && matchesType && matchesStatus
    })
  }, [documents, searchTerm, typeFilter, statusFilter])

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

  const getBadgeConfig = (status: string, paye: boolean) => {
    const norm = status.toUpperCase()
    if (paye || norm === 'PAYE') return { variant: 'success' as const, label: 'Soldé' }
    if (norm === 'BROUILLON' || norm === 'SAISI') return { variant: 'outline' as const, label: 'Brouillon' }
    if (norm === 'ANNULE') return { variant: 'destructive' as const, label: 'Annulé' }
    return { variant: 'warning' as const, label: 'En Cours' }
  }

  // Multi-select actions
  const toggleSelectAll = () => {
    if (selectedDocIds.size === filteredDocuments.length) {
      setSelectedDocIds(new Set())
    } else {
      setSelectedDocIds(new Set(filteredDocuments.map(d => d.id_document)))
    }
  }

  const toggleSelectDoc = (id: number) => {
    const next = new Set(selectedDocIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedDocIds(next)
  }

  // Exports selected or filtered items to CSV format
  const exportToCSV = () => {
    const docsToExport = selectedDocIds.size > 0 
      ? documents.filter(d => selectedDocIds.has(d.id_document))
      : filteredDocuments

    if (docsToExport.length === 0) return

    const headers = ['Date', 'N Piece', 'Type', 'Client', 'Affaire', 'HT (Dhs)', 'TTC (Dhs)', 'Solde Du (Dhs)', 'Statut']
    const rows = docsToExport.map(d => [
      formatDate(d.date_document),
      d.numero_document,
      d.type_document,
      d.partenaire?.nom_partenaire || d.nom_partenaire_snapshot || '',
      d.numero_affaire || '',
      Number(d.montant_ht).toFixed(2),
      Number(d.montant_ttc).toFixed(2),
      Number(d.solde_du).toFixed(2),
      d.statut_document
    ])

    const csvContent = "\uFEFF" + [headers.join(';'), ...rows.map(e => e.map(val => `"${val}"`).join(";"))].join("\n")
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `export_ventes_${new Date().toISOString().slice(0, 10)}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleBulkAction = (action: string) => {
    if (action === 'export') {
      exportToCSV()
    } else {
      alert(`Action "${action}" sur les documents sélectionnés.`)
    }
    setSelectedDocIds(new Set())
  }

  const allSelected = filteredDocuments.length > 0 && selectedDocIds.size === filteredDocuments.length
  const someSelected = selectedDocIds.size > 0 && selectedDocIds.size < filteredDocuments.length

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0 pb-20 md:gap-8 md:p-8 md:pb-8 animate-fade-in-up">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight gradient-text">Ventes</h1>
          <p className="text-sm text-muted-foreground">Gestion et suivi des documents commerciaux côté vente</p>
        </div>
        <Button onClick={fetchData} disabled={loading} size="lg" className="h-10">
          <HugeiconsIcon icon={RefreshIcon} className={cn("size-5", loading && "animate-spin")} data-icon="inline-start" />
          Actualiser
        </Button>
      </div>

      {/* KPI Stats Panel */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 stagger-children">
        <Card variant="kpi" className="hover-lift glow border-l-4 border-l-violet-500">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">CA TTC</CardTitle>
            <div className="icon-container bg-violet-500/10 p-1.5 rounded-lg">
              <HugeiconsIcon icon={Invoice01Icon} className="text-violet-500 size-4" />
            </div>
          </CardHeader>
          <CardContent className="p-0 pt-3">
            <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{formatPrice(stats.totalVentes)}</div>
            <p className="text-xs text-muted-foreground font-medium mt-1">{stats.docCount} documents</p>
          </CardContent>
        </Card>

        <Card variant="kpi" className="hover-lift glow border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Réglés</CardTitle>
            <div className="icon-container bg-emerald-500/10 p-1.5 rounded-lg">
              <HugeiconsIcon icon={SaleTag01Icon} className="text-emerald-500 size-4" />
            </div>
          </CardHeader>
          <CardContent className="p-0 pt-3">
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{stats.regleCount}</div>
            <p className="text-xs text-muted-foreground font-medium mt-1">Factures soldées</p>
          </CardContent>
        </Card>

        <Card variant="kpi" className="hover-lift glow border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">En Cours</CardTitle>
            <div className="icon-container bg-amber-500/10 p-1.5 rounded-lg">
              <HugeiconsIcon icon={FilterIcon} className="text-amber-500 size-4" />
            </div>
          </CardHeader>
          <CardContent className="p-0 pt-3">
            <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{stats.encoursCount}</div>
            <p className="text-xs text-muted-foreground font-medium mt-1">Non soldées</p>
          </CardContent>
        </Card>

        <Card variant="kpi" className="hover-lift glow border-l-4 border-l-rose-500">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-1">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Impayés</CardTitle>
            <div className="icon-container bg-rose-500/10 p-1.5 rounded-lg">
              <HugeiconsIcon icon={AlertCircleIcon} className="text-rose-500 size-4" />
            </div>
          </CardHeader>
          <CardContent className="p-0 pt-3">
            <div className="text-xl font-extrabold text-rose-600 dark:text-rose-400">{formatPrice(stats.impayeTotal)}</div>
            <p className="text-xs text-muted-foreground font-medium mt-1">Reste dû client</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Bulk Action Card */}
      <Card className="shadow-xs bg-slate-50/20 dark:bg-slate-900/10">
        <CardHeader className="p-3 pb-0">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <HugeiconsIcon icon={FilterIcon} className="size-4" />
              <span>Filtres de recherche</span>
            </div>
            
            {/* Quick stats counter */}
            <span className="text-xs text-muted-foreground">
              Affichage de <strong>{filteredDocuments.length}</strong> documents sur <strong>{documents.length}</strong>
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <HugeiconsIcon icon={Search01Icon} className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher (N° Pièce, Client, Affaire...)"
                className="pl-9 h-9 text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value ?? 'all')}>
              <SelectTrigger className="w-full h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">Tous les types</SelectItem>
                  {uniqueTypes.map(type => (
                    <SelectItem key={type} value={type || 'unknown'}>{type || 'Inconnu'}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value ?? 'all')}>
              <SelectTrigger className="w-full h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">Tous les statuts de paiement</SelectItem>
                  <SelectItem value="paye">Factures réglées (Soldées)</SelectItem>
                  <SelectItem value="impaye">Factures non soldées (Impayés)</SelectItem>
                  <SelectItem value="brouillon">En mode Brouillon</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Action floating banner */}
      {selectedDocIds.size > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 p-3 bg-violet-600 text-white rounded-lg shadow-md animate-fade-in-up">
          <span className="text-xs font-bold">{selectedDocIds.size} document(s) sélectionné(s)</span>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button size="xs" className="text-xs bg-white text-violet-700 hover:bg-slate-100 flex-1 sm:flex-none" onClick={() => handleBulkAction('pdf')}>
              Générer PDF
            </Button>
            <Button size="xs" className="text-xs bg-white text-violet-700 hover:bg-slate-100 flex-1 sm:flex-none" onClick={() => handleBulkAction('export')}>
              Exporter CSV
            </Button>
          </div>
        </div>
      )}

      {/* Main Table view */}
      <Card className="shadow-xs">
        <CardContent className="p-0">
          {error ? (
            <div className="p-8 text-center text-destructive border rounded-xl bg-destructive/5">
              <HugeiconsIcon icon={AlertCircleIcon} className="size-10 mx-auto text-destructive mb-3" />
              <p className="mb-4 font-bold">{error}</p>
              <Button onClick={fetchData} variant="outline">Réessayer</Button>
            </div>
          ) : loading ? (
            <div className="p-24 flex flex-col justify-center items-center gap-3">
              <div className="animate-spin rounded-full size-10 border-b-2 border-primary"></div>
              <span className="text-sm text-muted-foreground">Chargement des données...</span>
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
                <TableHeader className="bg-slate-50 dark:bg-slate-900/60 border-b">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[40px] text-center">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={el => {
                          if (el) el.indeterminate = someSelected
                        }}
                        onChange={toggleSelectAll}
                        className="rounded text-violet-600 focus:ring-violet-500 cursor-pointer size-4"
                      />
                    </TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider w-[100px]">Date</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider w-[120px]">N° Document</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider w-[100px]">Type</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider">Client</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider w-[110px]">Affaire</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-right w-[110px]">Total HT</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-right w-[110px]">Total TTC</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-right w-[110px]">Reste Dû</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-center w-[120px]">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => {
                    const isChecked = selectedDocIds.has(doc.id_document)
                    const badge = getBadgeConfig(doc.statut_document, doc.est_entierement_paye)
                    return (
                      <TableRow
                        key={doc.id_document}
                        className={cn(
                          "h-10 hover:bg-slate-50/70 dark:hover:bg-slate-900/30 transition-colors border-b",
                          isChecked && "bg-violet-500/5 dark:bg-violet-500/10"
                        )}
                      >
                        <TableCell className="text-center py-1">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectDoc(doc.id_document)}
                            className="rounded text-violet-600 focus:ring-violet-500 cursor-pointer size-4"
                          />
                        </TableCell>
                        <TableCell className="text-xs py-1 text-slate-600 dark:text-slate-400 font-medium">
                          {formatDate(doc.date_document)}
                        </TableCell>
                        <TableCell className="text-xs py-1 font-bold font-mono text-slate-850 dark:text-slate-200">
                          {doc.numero_document}
                        </TableCell>
                        <TableCell className="py-1">
                          <Badge variant="secondary" className="text-[10px] h-4.5 font-medium px-1.5">{doc.type_document}</Badge>
                        </TableCell>
                        <TableCell className="text-xs py-1 font-bold text-slate-700 dark:text-slate-300 truncate max-w-[200px]" title={doc.partenaire?.nom_partenaire || doc.nom_partenaire_snapshot || ''}>
                          {doc.partenaire?.nom_partenaire || doc.nom_partenaire_snapshot || '-'}
                        </TableCell>
                        <TableCell className="text-xs py-1 font-medium text-slate-500">
                          {doc.numero_affaire || '-'}
                        </TableCell>
                        <TableCell className="text-right py-1 font-mono text-slate-600 dark:text-slate-400 text-xs">
                          {formatPrice(Number(doc.montant_ht))}
                        </TableCell>
                        <TableCell className="text-right py-1 font-extrabold font-mono text-slate-850 dark:text-slate-100 text-xs">
                          {formatPrice(doc.montant_ttc_num)}
                        </TableCell>
                        <TableCell className="text-right py-1 font-mono text-xs text-rose-500 font-bold">
                          {doc.solde_du_num > 0 ? formatPrice(doc.solde_du_num) : '-'}
                        </TableCell>
                        <TableCell className="text-center py-1">
                          <Badge variant={badge.variant} className="text-[10px] h-4.5 px-2 font-semibold">
                            {badge.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
