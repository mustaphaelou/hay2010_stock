"use client"

import * as React from "react"
import Link from "next/link"
import { formatPrice } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SafeIcon as HugeiconsIcon } from "@/components/ui/safe-icon"
import {
  Package01Icon,
  UserGroupIcon,
  TruckIcon,
  Invoice01Icon,
  GridIcon,
  SaleTag01Icon,
  ShoppingCart01Icon,
  Money01Icon,
  Alert02Icon,
  FolderOpenIcon,
} from "@hugeicons/core-free-icons"
import { Badge } from "@/components/ui/badge"
import { Empty } from "@/components/ui/empty"

import { PaymentStatusChart } from "@/components/erp/dashboard-charts"

interface RecentDocType {
  id_document: number
  numero_piece: string
  date_document: Date
  partenaire?: { nom_partenaire: string } | null
  nom_tiers?: string | null
  montant_regle?: number | null
  montant_ttc?: number | null
  type_document?: string
  domaine_document?: string
}

interface DashboardViewProps {
  initialStats: {
    clients: number
    suppliers: number
    products: number
    families?: number
    salesCount: number
    purchasesCount: number
    lowStockCount?: number
    totalSalesAmount?: number
    totalPurchasesAmount?: number
  }
  initialRecentDocs: RecentDocType[]
  paymentData?: { name: string; value: number; fill: string }[]
  monthlyData?: { month: string; ventes: number; achats: number }[]
  salesInvoices?: Array<{
    montant_ttc: number | { toNumber(): number }
    montant_regle: number
  }>
  lastUpdated?: string
}

const formatMAD = (amount: number) =>
  amount.toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " MAD"

export function DashboardView({ initialStats, initialRecentDocs, paymentData, salesInvoices, lastUpdated }: DashboardViewProps) {
  const unpaidInvoices = React.useMemo(() => {
    if (!salesInvoices) return { count: 0, total: 0 }
    let count = 0
    let total = 0
    salesInvoices.forEach((inv) => {
      const ttc = Number(inv.montant_ttc)
      const regle = Number(inv.montant_regle)
      if (regle < ttc) {
        count++
        total += ttc - regle
      }
    })
    return { count, total }
  }, [salesInvoices])

  const lowStockCount = initialStats.lowStockCount ?? 0

  return (
    <div className="flex flex-col gap-6 sm:gap-8 animate-fade-in-up px-1 sm:px-0">
      {/* Header - with gradient text */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight gradient-text">Vue d&apos;ensemble</h2>
          <p className="text-sm text-muted-foreground">Bienvenue dans votre tableau de bord de gestion.</p>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-1">Dernière mise à jour : {lastUpdated}</p>
          )}
        </div>
      </div>

      {/* KPI Grid - Staggered animations */}
      <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4 stagger-children">
        <Link href="/customers" className="block">
          <Card variant="kpi" className="hover-lift glow hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-0">
              <CardTitle className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">Clients</CardTitle>
              <div className="icon-container">
                <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2.5} className="text-primary icon-bounce" />
              </div>
            </CardHeader>
            <CardContent className="p-0 pt-3">
              <div className="text-2xl sm:text-3xl font-extrabold animate-count-up">{initialStats.clients}</div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="flex h-1.5 w-1.5 rounded-full bg-green-500 pulse-ring" />
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Comptes actifs</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/suppliers" className="block">
          <Card variant="kpi" className="hover-lift glow hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-0">
              <CardTitle className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">Fournisseurs</CardTitle>
              <div className="icon-container opacity-90">
                <HugeiconsIcon icon={TruckIcon} strokeWidth={2.5} className="text-blue-500 icon-bounce" />
              </div>
            </CardHeader>
            <CardContent className="p-0 pt-3">
              <div className="text-2xl sm:text-3xl font-extrabold animate-count-up">{initialStats.suppliers}</div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="flex h-1.5 w-1.5 rounded-full bg-blue-500" />
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Fournisseurs</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/articles" className="block">
          <Card variant="kpi" className="hover-lift glow hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-0">
              <CardTitle className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">Articles</CardTitle>
              <div className="icon-container">
                <HugeiconsIcon icon={Package01Icon} strokeWidth={2.5} className="text-violet-500 icon-bounce" />
              </div>
            </CardHeader>
            <CardContent className="p-0 pt-3">
              <div className="text-2xl sm:text-3xl font-extrabold animate-count-up">{initialStats.products}</div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="flex h-1.5 w-1.5 rounded-full bg-violet-500" />
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Références</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/articles" className="block">
          <Card variant="kpi" className="hover-lift glow hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-0">
              <CardTitle className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">Familles</CardTitle>
              <div className="icon-container">
                <HugeiconsIcon icon={GridIcon} strokeWidth={2.5} className="text-orange-500 icon-bounce" />
              </div>
            </CardHeader>
            <CardContent className="p-0 pt-3">
              <div className="text-2xl sm:text-3xl font-extrabold animate-count-up">{initialStats.families || 0}</div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="flex h-1.5 w-1.5 rounded-full bg-orange-500" />
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Catégories</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/sales" className="block">
          <Card variant="kpi" className="hover-lift glow hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-0">
              <CardTitle className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">Ventes</CardTitle>
              <div className="icon-container">
                <HugeiconsIcon icon={SaleTag01Icon} strokeWidth={2.5} className="text-emerald-500 icon-bounce" />
              </div>
            </CardHeader>
            <CardContent className="p-0 pt-3">
              <div className="text-2xl sm:text-3xl font-extrabold animate-count-up">{initialStats.salesCount}</div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="flex h-1.5 w-1.5 rounded-full bg-green-500" />
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Documents</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/purchases" className="block">
          <Card variant="kpi" className="hover-lift glow hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-0">
              <CardTitle className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">Achats</CardTitle>
              <div className="icon-container w-8 h-8 sm:w-11 sm:h-11 shadow-sm">
                <HugeiconsIcon icon={ShoppingCart01Icon} strokeWidth={2.5} className="size-4 sm:size-5 text-fuchsia-500 icon-bounce" />
              </div>
            </CardHeader>
            <CardContent className="p-0 pt-3">
              <div className="text-2xl sm:text-3xl font-extrabold animate-count-up">{initialStats.purchasesCount}</div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="flex h-1.5 w-1.5 rounded-full bg-fuchsia-500" />
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Documents</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/sales" className="block">
          <Card variant="kpi" className="hover-lift glow hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-0">
              <CardTitle className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">CA Ventes</CardTitle>
              <div className="icon-container">
                <HugeiconsIcon icon={Money01Icon} strokeWidth={2.5} className="text-emerald-600 icon-bounce" />
              </div>
            </CardHeader>
            <CardContent className="p-0 pt-3">
              <div className="text-lg sm:text-xl font-extrabold animate-count-up">{formatMAD(initialStats.totalSalesAmount || 0)}</div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-600" />
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Total factures TTC</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/purchases" className="block">
          <Card variant="kpi" className="hover-lift glow hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-0">
              <CardTitle className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Achats</CardTitle>
              <div className="icon-container">
                <HugeiconsIcon icon={Money01Icon} strokeWidth={2.5} className="text-fuchsia-600 icon-bounce" />
              </div>
            </CardHeader>
            <CardContent className="p-0 pt-3">
              <div className="text-lg sm:text-xl font-extrabold animate-count-up">{formatMAD(initialStats.totalPurchasesAmount || 0)}</div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="flex h-1.5 w-1.5 rounded-full bg-fuchsia-600" />
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Total achats TTC</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Alert widgets row */}
      {(lowStockCount > 0 || unpaidInvoices.count > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
          {lowStockCount > 0 && (
            <Link href="/stock" className="block">
              <Card className="border-orange-500/30 bg-gradient-to-br from-orange-50/80 to-orange-100/50 dark:from-orange-950/40 dark:to-orange-900/20 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-orange-700 dark:text-orange-400">Articles en stock faible</CardTitle>
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-5 text-orange-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Badge variant="warning" className="text-base px-3 py-1">{lowStockCount}</Badge>
                    <p className="text-sm text-muted-foreground">articles sous le seuil de réapprovisionnement</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}

          {unpaidInvoices.count > 0 && (
            <Link href="/sales" className="block">
              <Card className="border-amber-500/30 bg-gradient-to-br from-amber-50/80 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-900/20 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-amber-700 dark:text-amber-400">Factures impayées</CardTitle>
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <HugeiconsIcon icon={Invoice01Icon} strokeWidth={2} className="size-5 text-amber-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Badge variant="warning" className="text-base px-3 py-1">{unpaidInvoices.count}</Badge>
                    <p className="text-sm text-muted-foreground">Montant restant : <span className="font-bold text-amber-700 dark:text-amber-400">{formatMAD(unpaidInvoices.total)}</span></p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      )}

            {/* Charts and Tables Row */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Payment Status Chart - takes 1 col on large screens */}
                <div className="lg:col-span-1">
                    {paymentData && paymentData.length > 0 && (
                        <PaymentStatusChart data={paymentData} />
                    )}
                </div>

                {/* Recent Documents - takes 2 cols on large screens */}
                <Card className="lg:col-span-2 overflow-hidden border-muted/40 shadow-sm transition-all hover:shadow-md">
                    <CardHeader className="pb-4 bg-muted/20 border-b">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg sm:text-xl font-bold">Derniers Documents</CardTitle>
                                <CardDescription className="text-xs sm:text-sm">
                                    Aperçu de vos transactions récentes.
                                </CardDescription>
                            </div>
                            <HugeiconsIcon icon={FolderOpenIcon} className="size-5 text-muted-foreground" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table className="w-full">
                                <TableHeader className="bg-muted/30">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="text-xs sm:text-sm font-semibold py-4 px-4 sm:px-6">N° Pièce</TableHead>
                                        <TableHead className="text-xs sm:text-sm font-semibold py-4 px-2 sm:px-4">Tiers</TableHead>
                                        <TableHead className="text-xs sm:text-sm font-semibold py-4 px-2 sm:px-4 text-center">Statut</TableHead>
                                        <TableHead className="text-xs sm:text-sm font-semibold py-4 px-4 sm:px-6 text-right">Montant</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
            {initialRecentDocs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <Empty
                    title="Aucun document récent"
                    description="Les documents récents apparaîtront ici une fois créés."
                    icon={Invoice01Icon}
                  />
                </TableCell>
              </TableRow>
            ) : (
                                        initialRecentDocs.map((doc) => (
                                            <TableRow key={doc.id_document} className="group transition-all duration-200 hover:bg-primary/5 cursor-pointer">
                                                <TableCell className="py-4 px-4 sm:px-6">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-sm text-foreground/90">{doc.numero_piece}</span>
                                                        <span className="text-[10px] text-muted-foreground">{doc.date_document ? new Date(doc.date_document).toLocaleDateString() : ""}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4 px-2 sm:px-4">
                                                    <span className="text-sm font-medium">{doc.partenaire?.nom_partenaire || doc.nom_tiers || "-"}</span>
                                                </TableCell>
                                                <TableCell className="py-4 px-2 sm:px-4 text-center">
                                                    <Badge variant={Number(doc.montant_regle || 0) >= Number(doc.montant_ttc || 0) ? "success" : "warning"} className="text-[10px] px-2 py-0">
                                                        {Number(doc.montant_regle || 0) >= Number(doc.montant_ttc || 0) ? "Réglé" : "En cours"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="py-4 px-4 sm:px-6 text-right">
                                                    <span className="text-sm font-extrabold text-primary">{formatPrice(Number(doc.montant_ttc || 0))}</span>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
