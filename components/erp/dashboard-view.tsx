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
        <div className="space-y-4 sm:space-y-6 animate-fade-in-up px-1 sm:px-0">
            {/* Header - smaller on mobile */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Vue d'ensemble</h2>
            </div>

            {/* KPI Grid - 2 columns on mobile, 6 on desktop */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6">
                <Card variant="kpi" className="p-3 sm:p-4">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-0">
                        <CardTitle className="text-xs sm:text-sm font-medium">Clients</CardTitle>
                        <div className="icon-container w-8 h-8 sm:w-10 sm:h-10">
                            <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 pt-2">
                        <div className="text-xl sm:text-2xl font-bold animate-count-up">{initialStats.clients}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Comptes actifs</p>
                    </CardContent>
                </Card>

                <Card variant="kpi" className="p-3 sm:p-4">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-0">
                        <CardTitle className="text-xs sm:text-sm font-medium">Fournisseurs</CardTitle>
                        <div className="icon-container w-8 h-8 sm:w-10 sm:h-10">
                            <HugeiconsIcon icon={TruckDeliveryIcon} strokeWidth={2} className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 pt-2">
                        <div className="text-xl sm:text-2xl font-bold animate-count-up">{initialStats.suppliers}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Comptes actifs</p>
                    </CardContent>
                </Card>

                <Card variant="kpi" className="p-3 sm:p-4">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-0">
                        <CardTitle className="text-xs sm:text-sm font-medium">Produits</CardTitle>
                        <div className="icon-container w-8 h-8 sm:w-10 sm:h-10">
                            <HugeiconsIcon icon={PackageIcon} strokeWidth={2} className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 pt-2">
                        <div className="text-xl sm:text-2xl font-bold animate-count-up">{initialStats.products}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Articles</p>
                    </CardContent>
                </Card>

                <Card variant="kpi" className="p-3 sm:p-4">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-0">
                        <CardTitle className="text-xs sm:text-sm font-medium">Familles</CardTitle>
                        <div className="icon-container w-8 h-8 sm:w-10 sm:h-10">
                            <HugeiconsIcon icon={FolderOpenIcon} strokeWidth={2} className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-500" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 pt-2">
                        <div className="text-xl sm:text-2xl font-bold animate-count-up">{initialStats.families || 0}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Catégories</p>
                    </CardContent>
                </Card>

                <Card variant="kpi" className="p-3 sm:p-4">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-0">
                        <CardTitle className="text-xs sm:text-sm font-medium">Ventes</CardTitle>
                        <div className="icon-container w-8 h-8 sm:w-10 sm:h-10">
                            <HugeiconsIcon icon={Invoice01Icon} strokeWidth={2} className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 pt-2">
                        <div className="text-xl sm:text-2xl font-bold animate-count-up">{initialStats.salesCount}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Documents</p>
                    </CardContent>
                </Card>

                <Card variant="kpi" className="p-3 sm:p-4">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-0">
                        <CardTitle className="text-xs sm:text-sm font-medium">Achats</CardTitle>
                        <div className="icon-container w-8 h-8 sm:w-10 sm:h-10">
                            <HugeiconsIcon icon={ShoppingBag01Icon} strokeWidth={2} className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-500" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 pt-2">
                        <div className="text-xl sm:text-2xl font-bold animate-count-up">{initialStats.purchasesCount}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Documents</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            {paymentData && paymentData.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                    <PaymentStatusChart data={paymentData} />
                    <Card className="col-span-1">
                        <CardHeader className="pb-3 sm:pb-4">
                            <CardTitle className="text-lg sm:text-xl">Derniers Documents</CardTitle>
                            <CardDescription className="text-xs sm:text-sm">
                                Vos 5 derniers documents créés.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 sm:p-6 pt-0 sm:pt-0">
                            <Table className="w-full table-fixed">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-[10px] sm:text-sm w-[25%] sm:w-auto px-2 sm:px-4">N° Pièce</TableHead>
                                        <TableHead className="text-[10px] sm:text-sm w-[35%] sm:w-auto px-1 sm:px-4">Tiers</TableHead>
                                        <TableHead className="text-[10px] sm:text-sm w-[20%] sm:w-auto px-1 sm:px-4 text-right">Montant</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {initialRecentDocs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center py-4 text-muted-foreground text-sm">Aucun document trouvé</TableCell>
                                        </TableRow>
                                    ) : (
                                        initialRecentDocs.map((doc) => (
                                            <TableRow key={doc.cbmarq}>
                                                <TableCell className="font-medium text-[10px] sm:text-sm py-2 sm:py-3 px-2 sm:px-4 truncate">{doc.do_piece}</TableCell>
                                                <TableCell className="text-[10px] sm:text-sm py-2 sm:py-3 px-1 sm:px-4 truncate">{(doc as any).f_comptet?.ct_intitule || doc.do_tiers}</TableCell>
                                                <TableCell className="text-right text-[10px] sm:text-sm py-2 sm:py-3 px-1 sm:px-4 font-medium">{formatPrice(doc.do_totalttc)}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Fallback: Just recent docs if no chart data */}
            {(!paymentData || paymentData.length === 0) && (
                <div className="grid gap-4">
                    <Card className="col-span-1">
                        <CardHeader className="pb-3 sm:pb-4">
                            <CardTitle className="text-lg sm:text-xl">Derniers Documents</CardTitle>
                            <CardDescription className="text-xs sm:text-sm">
                                Vos 5 derniers documents créés.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 sm:p-6 pt-0 sm:pt-0">
                            <Table className="w-full table-fixed">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-[10px] sm:text-sm w-[22%] sm:w-auto px-2 sm:px-4">N° Pièce</TableHead>
                                        <TableHead className="text-[10px] sm:text-sm w-[38%] sm:w-auto px-1 sm:px-4">Tiers</TableHead>
                                        <TableHead className="text-[10px] sm:text-sm w-[20%] sm:w-auto px-1 sm:px-4">Date</TableHead>
                                        <TableHead className="text-[10px] sm:text-sm w-[20%] sm:w-auto px-1 sm:px-4 text-right">Montant</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {initialRecentDocs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-4 text-muted-foreground text-sm">Aucun document trouvé</TableCell>
                                        </TableRow>
                                    ) : (
                                        initialRecentDocs.map((doc) => (
                                            <TableRow key={doc.cbmarq}>
                                                <TableCell className="font-medium text-[10px] sm:text-sm py-2 sm:py-3 px-2 sm:px-4 truncate">{doc.do_piece}</TableCell>
                                                <TableCell className="text-[10px] sm:text-sm py-2 sm:py-3 px-1 sm:px-4 truncate">{(doc as any).f_comptet?.ct_intitule || doc.do_tiers}</TableCell>
                                                <TableCell className="text-[10px] sm:text-sm py-2 sm:py-3 px-1 sm:px-4">{doc.do_date?.split('T')[0]}</TableCell>
                                                <TableCell className="text-right text-[10px] sm:text-sm py-2 sm:py-3 px-1 sm:px-4 font-medium">{formatPrice(doc.do_totalttc)}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}

