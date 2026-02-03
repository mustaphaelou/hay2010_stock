"use client"

import * as React from "react"
import { formatPrice } from "@/lib/utils/format"
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
import { HugeiconsIcon } from "@hugeicons/react"
import {
    PackageIcon,
    UserGroupIcon,
    ShoppingBag01Icon,
    Invoice01Icon,
    TruckDeliveryIcon,
    FolderOpenIcon,
} from "@hugeicons/core-free-icons"
import { Badge } from "@/components/ui/badge"

import { FDocentete } from "@/lib/supabase/types"
import { PaymentStatusChart } from "@/components/erp/dashboard-charts"

interface DashboardViewProps {
    initialStats: {
        clients: number
        suppliers: number
        products: number
        families?: number
        salesCount: number
        purchasesCount: number
    }
    initialRecentDocs: FDocentete[]
    paymentData?: { name: string; value: number; fill: string }[]
    monthlyData?: { month: string; ventes: number; achats: number }[]
}

export function DashboardView({ initialStats, initialRecentDocs, paymentData, monthlyData }: DashboardViewProps) {
    return (
        <div className="space-y-6 sm:space-y-8 animate-fade-in-up px-1 sm:px-0">
            {/* Header - with gradient text */}
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight gradient-text">Vue d'ensemble</h2>
                    <p className="text-sm text-muted-foreground">Bienvenue dans votre tableau de bord de gestion.</p>
                </div>
            </div>

            {/* KPI Grid - Staggered animations */}
            <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-6 stagger-children">
                <Card variant="kpi" className="hover-lift glow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-0">
                        <CardTitle className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">Clients</CardTitle>
                        <div className="icon-container w-8 h-8 sm:w-11 sm:h-11 shadow-sm">
                            <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2.5} className="h-4 w-4 sm:h-5 sm:w-5 text-primary icon-bounce" />
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

                <Card variant="kpi" className="hover-lift glow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-0">
                        <CardTitle className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">Fournisseurs</CardTitle>
                        <div className="icon-container w-8 h-8 sm:w-11 sm:h-11 shadow-sm opacity-90">
                            <HugeiconsIcon icon={TruckDeliveryIcon} strokeWidth={2.5} className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 icon-bounce" />
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

                <Card variant="kpi" className="hover-lift glow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-0">
                        <CardTitle className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">Articles</CardTitle>
                        <div className="icon-container w-8 h-8 sm:w-11 sm:h-11 shadow-sm">
                            <HugeiconsIcon icon={PackageIcon} strokeWidth={2.5} className="h-4 w-4 sm:h-5 sm:w-5 text-violet-500 icon-bounce" />
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

                <Card variant="kpi" className="hover-lift glow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-0">
                        <CardTitle className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">Familles</CardTitle>
                        <div className="icon-container w-8 h-8 sm:w-11 sm:h-11 shadow-sm">
                            <HugeiconsIcon icon={FolderOpenIcon} strokeWidth={2.5} className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500 icon-bounce" />
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

                <Card variant="kpi" className="hover-lift glow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-0">
                        <CardTitle className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">Ventes</CardTitle>
                        <div className="icon-container w-8 h-8 sm:w-11 sm:h-11 shadow-sm">
                            <HugeiconsIcon icon={Invoice01Icon} strokeWidth={2.5} className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 icon-bounce" />
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

                <Card variant="kpi" className="hover-lift glow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-0">
                        <CardTitle className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">Achats</CardTitle>
                        <div className="icon-container w-8 h-8 sm:w-11 sm:h-11 shadow-sm">
                            <HugeiconsIcon icon={ShoppingBag01Icon} strokeWidth={2.5} className="h-4 w-4 sm:h-5 sm:w-5 text-fuchsia-500 icon-bounce" />
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
            </div>

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
                            <HugeiconsIcon icon={FolderOpenIcon} className="h-5 w-5 text-muted-foreground" />
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
                                            <TableCell colSpan={4} className="text-center py-12 text-muted-foreground italic">Aucun document récent à afficher</TableCell>
                                        </TableRow>
                                    ) : (
                                        initialRecentDocs.map((doc) => (
                                            <TableRow key={doc.cbmarq} className="group transition-all duration-200 hover:bg-primary/5 cursor-pointer">
                                                <TableCell className="py-4 px-4 sm:px-6">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-sm text-foreground/90">{doc.do_piece}</span>
                                                        <span className="text-[10px] text-muted-foreground">{new Date(doc.do_date || "").toLocaleDateString()}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4 px-2 sm:px-4">
                                                    <span className="text-sm font-medium">{(doc as any).f_comptet?.ct_intitule || doc.do_tiers || "-"}</span>
                                                </TableCell>
                                                <TableCell className="py-4 px-2 sm:px-4 text-center">
                                                    <Badge variant={(doc as any).do_montregl >= (doc as any).do_totalttc ? "success" : "warning"} className="text-[10px] px-2 py-0">
                                                        {(doc as any).do_montregl >= (doc as any).do_totalttc ? "Réglé" : "En cours"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="py-4 px-4 sm:px-6 text-right">
                                                    <span className="text-sm font-extrabold text-primary">{formatPrice(doc.do_totalttc)}</span>
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

