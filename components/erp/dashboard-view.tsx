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
} from "@hugeicons/core-free-icons"

import { FDocentete } from "@/lib/supabase/types"

interface DashboardViewProps {
    initialStats: {
        clients: number
        suppliers: number
        products: number
        salesCount: number
        purchasesCount: number
    }
    initialRecentDocs: FDocentete[]
}

export function DashboardView({ initialStats, initialRecentDocs }: DashboardViewProps) {
    return (
        <div className="space-y-4 sm:space-y-6 animate-fade-in-up px-1 sm:px-0">
            {/* Header - smaller on mobile */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Vue d'ensemble</h2>
            </div>

            {/* KPI Grid - 2 columns on mobile, 4 on desktop */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <Card variant="kpi" className="p-3 sm:p-4">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-0">
                        <CardTitle className="text-xs sm:text-sm font-medium">Clients</CardTitle>
                        <div className="icon-container w-8 h-8 sm:w-10 sm:h-10">
                            <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 pt-2">
                        <div className="text-xl sm:text-2xl font-bold animate-count-up">{initialStats.clients}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">+0 ce mois</p>
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
                        <CardTitle className="text-xs sm:text-sm font-medium">Ventes</CardTitle>
                        <div className="icon-container w-8 h-8 sm:w-10 sm:h-10">
                            <HugeiconsIcon icon={Invoice01Icon} strokeWidth={2} className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
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
                            <HugeiconsIcon icon={ShoppingBag01Icon} strokeWidth={2} className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 pt-2">
                        <div className="text-xl sm:text-2xl font-bold animate-count-up">{initialStats.purchasesCount}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Documents</p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Documents - Full width on mobile */}
            <div className="grid gap-4">
                <Card className="col-span-1">
                    <CardHeader className="pb-3 sm:pb-4">
                        <CardTitle className="text-lg sm:text-xl">Derniers Documents</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                            Vos 5 derniers documents créés.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
                        {/* Horizontal scroll for table on mobile */}
                        <div className="overflow-x-auto -mx-2 sm:mx-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-xs sm:text-sm whitespace-nowrap">N° Pièce</TableHead>
                                        <TableHead className="text-xs sm:text-sm">Tiers</TableHead>
                                        <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Date</TableHead>
                                        <TableHead className="text-xs sm:text-sm text-right whitespace-nowrap">Montant</TableHead>
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
                                                <TableCell className="font-medium text-xs sm:text-sm py-3">{doc.do_piece}</TableCell>
                                                <TableCell className="text-xs sm:text-sm py-3 max-w-[120px] sm:max-w-none truncate">{(doc as any).f_comptet?.ct_intitule || doc.do_tiers}</TableCell>
                                                <TableCell className="text-xs sm:text-sm py-3 hidden sm:table-cell">{doc.do_date}</TableCell>
                                                <TableCell className="text-right text-xs sm:text-sm py-3 font-medium whitespace-nowrap">{formatPrice(doc.do_totalttc)}</TableCell>
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
