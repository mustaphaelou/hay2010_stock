"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SafeIcon as HugeiconsIcon } from "@/components/ui/safe-icon"
import { Alert02Icon, Invoice01Icon } from "@hugeicons/core-free-icons"

const formatMAD = (amount: number) =>
  amount.toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " MAD"

interface DashboardAlertsProps {
  lowStockCount: number
  unpaidInvoices?: {
    count: number
    total: number
  }
}

export function DashboardAlerts({ lowStockCount, unpaidInvoices }: DashboardAlertsProps) {
  if (lowStockCount <= 0 && (!unpaidInvoices || unpaidInvoices.count <= 0)) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      {unpaidInvoices && unpaidInvoices.count > 0 && (
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
  )
}
