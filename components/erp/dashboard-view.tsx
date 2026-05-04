"use client"

import * as React from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { formatPrice } from "@/lib/utils"
import { computeGrossMargin, computeUnpaidInvoices, isPaymentComplete } from "@/lib/dashboard/compute-margins"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
  ArrowUp01Icon,
  ArrowDown01Icon,
} from "@hugeicons/core-free-icons"
import { Badge } from "@/components/ui/badge"
import { Empty } from "@/components/ui/empty"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

const PaymentStatusChart = dynamic(
  () => import("@/components/erp/dashboard-charts").then(m => ({ default: m.PaymentStatusChart })),
  { ssr: true, loading: () => <div className="h-[300px] animate-pulse rounded-lg bg-muted/50" /> }
)

interface RecentDocType {
  id_document: number
  numero_piece: string
  date_document: Date
  partenaire?: { nom_partenaire: string } | null
  nom_tiers?: string | null
  montant_regle?: number | null
  montant_ttc?: number | { toNumber(): number } | null
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

const kpiConfig = [
  { key: "clients", label: "Clients", statKey: "clients" as const, href: "/customers", icon: UserGroupIcon, description: "Comptes actifs" },
  { key: "suppliers", label: "Fournisseurs", statKey: "suppliers" as const, href: "/suppliers", icon: TruckIcon, description: "Fournisseurs actifs" },
  { key: "products", label: "Articles", statKey: "products" as const, href: "/articles", icon: Package01Icon, description: "Références" },
  { key: "families", label: "Familles", statKey: "families" as const, href: "/articles", icon: GridIcon, description: "Catégories" },
  { key: "sales", label: "Ventes", statKey: "salesCount" as const, href: "/sales", icon: SaleTag01Icon, description: "Documents" },
  { key: "purchases", label: "Achats", statKey: "purchasesCount" as const, href: "/purchases", icon: ShoppingCart01Icon, description: "Documents" },
  { key: "caVentes", label: "CA Ventes", statKey: "totalSalesAmount" as const, href: "/sales", icon: Money01Icon, description: "Total factures TTC", isMonetary: true },
  { key: "totalAchats", label: "Total Achats", statKey: "totalPurchasesAmount" as const, href: "/purchases", icon: Money01Icon, description: "Total achats TTC", isMonetary: true },
]

export function DashboardView({ initialStats, initialRecentDocs, paymentData, salesInvoices, lastUpdated }: DashboardViewProps) {
  const unpaidInvoices = React.useMemo(() => {
    if (!salesInvoices) return { count: 0, total: 0 }
    return computeUnpaidInvoices(salesInvoices)
  }, [salesInvoices])

  const lowStockCount = initialStats.lowStockCount ?? 0

  return (
    <div className="flex flex-col gap-6 sm:gap-8 animate-fade-in-up px-1 sm:px-0">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight gradient-text">Vue d&apos;ensemble</h2>
          <p className="text-sm text-muted-foreground">Bienvenue dans votre tableau de bord de gestion.</p>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-1">Dernière mise à jour : {lastUpdated}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 stagger-children">
        {kpiConfig.map((kpi) => {
          const value = initialStats[kpi.statKey] ?? 0
          return (
            <Link key={kpi.key} href={kpi.href} className="block">
              <Card variant="kpi" className="hover-lift glow transition-all duration-200 cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between p-0 pb-1 sm:pb-2">
                  <CardTitle className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">{kpi.label}</CardTitle>
                  <div className="icon-container">
                    <HugeiconsIcon icon={kpi.icon} strokeWidth={2.5} className="text-primary icon-bounce" />
                  </div>
                </CardHeader>
                <CardContent className="p-0 pt-3">
                  <div className="text-xl sm:text-2xl font-extrabold animate-count-up">
                    {kpi.isMonetary ? formatMAD(Number(value)) : value}
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-medium mt-1">{kpi.description}</p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {(lowStockCount > 0 || unpaidInvoices.count > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {lowStockCount > 0 && (
            <Link href="/stock" className="block">
              <Card className="border-warning/30 bg-gradient-to-br from-warning/5 to-warning/10 hover:shadow-md transition-all duration-200 cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
                  <CardTitle className="text-sm font-semibold text-warning">Articles en stock faible</CardTitle>
                  <div className="p-2 rounded-lg bg-warning/10">
                    <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-5 text-warning" />
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
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
              <Card className="border-warning/30 bg-gradient-to-br from-warning/5 to-warning/10 hover:shadow-md transition-all duration-200 cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
                  <CardTitle className="text-sm font-semibold text-warning">Factures impayées</CardTitle>
                  <div className="p-2 rounded-lg bg-warning/10">
                    <HugeiconsIcon icon={Invoice01Icon} strokeWidth={2} className="size-5 text-warning" />
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="flex items-center gap-3">
                    <Badge variant="warning" className="text-base px-3 py-1">{unpaidInvoices.count}</Badge>
                    <p className="text-sm text-muted-foreground">Montant restant : <span className="font-bold text-warning">{formatMAD(unpaidInvoices.total)}</span></p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-1">
          {paymentData && paymentData.length > 0 && (
            <PaymentStatusChart data={paymentData} />
          )}
        </div>

        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Derniers Documents</CardTitle>
                <CardDescription className="text-xs">
                  Aperçu de vos transactions récentes
                </CardDescription>
              </div>
              <HugeiconsIcon icon={FolderOpenIcon} className="size-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {initialRecentDocs.length === 0 ? (
              <div className="p-6">
                <Empty
                  title="Aucun document récent"
                  description="Les documents récents apparaîtront ici une fois créés."
                  icon={Invoice01Icon}
                />
              </div>
            ) : (
              <div className="divide-y">
                {initialRecentDocs.map((doc) => {
                    const isPaid = isPaymentComplete(doc.montant_regle, doc.montant_ttc)
                  return (
                    <Link key={doc.id_document} href={`/documents/${doc.id_document}`} className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                          <HugeiconsIcon icon={Invoice01Icon} className="size-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{doc.numero_piece}</p>
                          <p className="text-xs text-muted-foreground truncate">{doc.partenaire?.nom_partenaire || doc.nom_tiers || "-"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <Badge variant={isPaid ? "success" : "warning"} className="text-[10px] px-2 py-0">
                          {isPaid ? "Réglé" : "En cours"}
                        </Badge>
                        <span className="text-sm font-bold text-primary tabular-nums">{formatPrice(Number(doc.montant_ttc || 0))}</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Accès Rapide</CardTitle>
            <CardDescription className="text-xs">Navigation vers les pages clés</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <Link href="/articles">
              <Button variant="ghost" className="w-full justify-start gap-2">
                <HugeiconsIcon icon={Package01Icon} data-icon="inline-start" />
                Articles
              </Button>
            </Link>
            <Link href="/stock">
              <Button variant="ghost" className="w-full justify-start gap-2">
                <HugeiconsIcon icon={Package01Icon} data-icon="inline-start" />
                Stock
              </Button>
            </Link>
            <Link href="/sales">
              <Button variant="ghost" className="w-full justify-start gap-2">
                <HugeiconsIcon icon={SaleTag01Icon} data-icon="inline-start" />
                Ventes
              </Button>
            </Link>
            <Link href="/purchases">
              <Button variant="ghost" className="w-full justify-start gap-2">
                <HugeiconsIcon icon={ShoppingCart01Icon} data-icon="inline-start" />
                Achats
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Résumé Financier</CardTitle>
            <CardDescription className="text-xs">Vue synthétique des montants</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-success/10">
                    <HugeiconsIcon icon={SaleTag01Icon} className="size-4 text-success" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Chiffre d&apos;affaires ventes</p>
                    <p className="text-lg font-bold">{formatMAD(initialStats.totalSalesAmount ?? 0)}</p>
                  </div>
                </div>
                <Badge variant="success" className="gap-1">
                  <HugeiconsIcon icon={ArrowUp01Icon} className="size-3" />
                  {initialStats.salesCount} doc
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-info/10">
                    <HugeiconsIcon icon={ShoppingCart01Icon} className="size-4 text-info" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total achats</p>
                    <p className="text-lg font-bold">{formatMAD(initialStats.totalPurchasesAmount ?? 0)}</p>
                  </div>
                </div>
                <Badge variant="info" className="gap-1">
                  <HugeiconsIcon icon={ArrowDown01Icon} className="size-3" />
                  {initialStats.purchasesCount} doc
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                    <HugeiconsIcon icon={Money01Icon} className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Marge brute estimée</p>
                    <p className="text-lg font-bold text-primary">{formatMAD(computeGrossMargin(initialStats.totalSalesAmount, initialStats.totalPurchasesAmount))}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
