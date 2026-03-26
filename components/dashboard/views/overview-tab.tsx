"use client"

import * as React from "react"
import { KPICardsGrid, type KPIConfig } from "@/components/dashboard/cards/kpi-cards-grid"
import { SalesPurchasesChart, type MonthlyData } from "@/components/dashboard/charts/sales-purchases-chart"
import { DocumentsTable, type DocumentItem } from "@/components/dashboard/tables/documents-table"
import { PaymentStatusChart } from "@/components/erp/dashboard-charts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRealtimeDashboard } from "@/hooks/use-realtime-dashboard"
import { HugeiconsIcon } from "@hugeicons/react"
import {
    UserGroupIcon,
    TruckDeliveryIcon,
    PackageIcon,
    FolderOpenIcon,
    Invoice01Icon,
    ShoppingBag01Icon,
    Notification01Icon,
    Analytics01Icon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

interface DashboardStats {
    clients: number
    suppliers: number
    products: number
    families: number
    salesCount: number
    purchasesCount: number
}

interface RecentDoc {
    id_document: number
    numero_piece: string
    date_document: Date
    partenaire?: { nom_partenaire: string } | null
    nom_tiers?: string | null
    montant_regle?: number | null
    montant_ttc?: number | null
}

interface OverviewTabProps {
    initialStats: DashboardStats
    initialRecentDocs: RecentDoc[]
    paymentData?: { name: string; value: number; fill: string }[]
    monthlyData?: MonthlyData[]
    documents?: DocumentItem[]
    loading?: boolean
    className?: string
}

export function OverviewTab({
    initialStats,
    initialRecentDocs,
    paymentData,
    monthlyData,
    documents = [],
    loading = false,
    className,
}: OverviewTabProps) {
    const [stats, setStats] = React.useState(initialStats)

    // Setup real-time updates
    const { isConnected, lastUpdate } = useRealtimeDashboard({
        onStatsUpdate: (update) => {
            setStats((prev) => ({
                ...prev,
                clients: prev.clients + (update.clients || 0),
                suppliers: prev.suppliers + (update.suppliers || 0),
                products: prev.products + (update.products || 0),
                salesCount: prev.salesCount + (update.salesCount || 0),
                purchasesCount: prev.purchasesCount + (update.purchasesCount || 0),
            }))
        },
        enabled: true,
    })

    // KPI Cards Configuration
    const kpiCards: KPIConfig[] = [
        {
            id: "clients",
            title: "Clients",
            value: stats.clients,
            description: "Comptes actifs",
            icon: UserGroupIcon,
            iconColor: "text-primary",
            href: "/partners?tab=clients",
        },
        {
            id: "suppliers",
            title: "Fournisseurs",
            value: stats.suppliers,
            description: "Fournisseurs",
            icon: TruckDeliveryIcon,
            iconColor: "text-blue-500",
            href: "/partners?tab=suppliers",
        },
        {
            id: "products",
            title: "Articles",
            value: stats.products,
            description: "Références",
            icon: PackageIcon,
            iconColor: "text-violet-500",
            href: "/articles",
        },
        {
            id: "families",
            title: "Familles",
            value: stats.families,
            description: "Catégories",
            icon: FolderOpenIcon,
            iconColor: "text-orange-500",
        },
        {
            id: "sales",
            title: "Ventes",
            value: stats.salesCount,
            description: "Documents",
            icon: Invoice01Icon,
            iconColor: "text-emerald-500",
        },
        {
            id: "purchases",
            title: "Achats",
            value: stats.purchasesCount,
            description: "Documents",
            icon: ShoppingBag01Icon,
            iconColor: "text-fuchsia-500",
        },
    ]

    return (
        <div className={cn("flex flex-col gap-6 animate-fade-in-up", className)}>
            {/* Real-time Status Indicator */}
            {isConnected && lastUpdate && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    Mise à jour en temps réel
                    <span className="text-muted-foreground/50">
                        ({lastUpdate.toLocaleTimeString("fr-FR")})
                    </span>
                </div>
            )}

            {/* KPI Cards Grid */}
            <KPICardsGrid
                cards={kpiCards}
                columns={6}
                loading={loading}
                animated={!loading}
            />

            {/* Charts Row */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Payment Status Chart */}
                <div className="lg:col-span-1">
                    {paymentData && paymentData.length > 0 && (
                        <PaymentStatusChart data={paymentData} />
                    )}
                </div>

                {/* Sales vs Purchases Chart */}
                <div className="lg:col-span-2">
                    <SalesPurchasesChart
                        data={monthlyData || []}
                        loading={loading}
                        height={350}
                        showComparison={true}
                    />
                </div>
            </div>

            {/* Recent Documents Table */}
            <Card className="overflow-hidden">
                <CardHeader className="bg-muted/20 border-b">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <HugeiconsIcon icon={Analytics01Icon} className="size-5 text-primary" />
                                Derniers Documents
                            </CardTitle>
                            <CardDescription>
                                Aperçu de vos transactions récentes
                            </CardDescription>
                        </div>
                        <Badge variant="secondary" className="hidden sm:inline-flex">
                            {initialRecentDocs.length} documents
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <DocumentsTable
                        data={documents}
                        loading={loading}
                        pageSize={5}
                        showExport={false}
                    />
                </CardContent>
            </Card>
        </div>
    )
}

export type { OverviewTabProps, DashboardStats, RecentDoc }
