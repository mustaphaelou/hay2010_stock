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
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Vue d'ensemble</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card variant="kpi">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                        <div className="icon-container">
                            <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} className="h-4 w-4 text-primary" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold animate-count-up">{initialStats.clients}</div>
                        <p className="text-xs text-muted-foreground">+0 depuis le mois dernier</p>
                    </CardContent>
                </Card>

                <Card variant="kpi">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Produits</CardTitle>
                        <div className="icon-container">
                            <HugeiconsIcon icon={PackageIcon} strokeWidth={2} className="h-4 w-4 text-primary" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold animate-count-up">{initialStats.products}</div>
                        <p className="text-xs text-muted-foreground">Articles référencés</p>
                    </CardContent>
                </Card>

                <Card variant="kpi">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ventes</CardTitle>
                        <div className="icon-container">
                            <HugeiconsIcon icon={Invoice01Icon} strokeWidth={2} className="h-4 w-4 text-primary" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold animate-count-up">{initialStats.salesCount}</div>
                        <p className="text-xs text-muted-foreground">Documents de vente</p>
                    </CardContent>
                </Card>

                <Card variant="kpi">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Achats</CardTitle>
                        <div className="icon-container">
                            <HugeiconsIcon icon={ShoppingBag01Icon} strokeWidth={2} className="h-4 w-4 text-primary" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold animate-count-up">{initialStats.purchasesCount}</div>
                        <p className="text-xs text-muted-foreground">Documents d'achat</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Derniers Documents</CardTitle>
                        <CardDescription>
                            Vos 5 derniers documents créés.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>N° Pièce</TableHead>
                                    <TableHead>Tiers</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Montant TTC</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {initialRecentDocs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">Aucun document trouvé</TableCell>
                                    </TableRow>
                                ) : (
                                    initialRecentDocs.map((doc) => (
                                        <TableRow key={doc.cbmarq}>
                                            <TableCell className="font-medium">{doc.do_piece}</TableCell>
                                            <TableCell>{(doc as any).f_comptet?.ct_intitule || doc.do_tiers}</TableCell>
                                            <TableCell>{doc.do_date}</TableCell>
                                            <TableCell className="text-right">{formatPrice(doc.do_totalttc)}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
