import * as React from "react"
import {
  ArrowDown01Icon,
  ArrowLeftRightIcon,
  ArrowUp01Icon,
  NoteIcon,
} from "@hugeicons/core-free-icons"
import type { IconSvgElement } from "@hugeicons/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SafeIcon as HugeiconsIcon } from "@/components/ui/safe-icon"
import { cn, formatRelativeTime } from "@/lib/utils"
import type { DashboardMovementData } from "@/lib/types"

type MovementType = DashboardMovementData["type"]

interface TodaysMovementsProps {
  movements: DashboardMovementData[]
  maxItems?: number
  title?: string
  description?: string
  className?: string
}

const TYPE_ICON: Record<MovementType, IconSvgElement> = {
  ENTREE: ArrowDown01Icon,
  SORTIE: ArrowUp01Icon,
  TRANSFERT: ArrowLeftRightIcon,
  INVENTAIRE: NoteIcon,
}

const POSITIVE_TYPES = new Set<MovementType>(["ENTREE", "INVENTAIRE", "TRANSFERT"])
const NEGATIVE_TYPES = new Set<MovementType>(["SORTIE"])

function signedQuantity(type: MovementType, qty: number): { sign: "+" | "-" | ""; display: string } {
  const sign = NEGATIVE_TYPES.has(type) ? "-" : POSITIVE_TYPES.has(type) ? "+" : ""
  const display = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(qty)
  return { sign, display }
}

function TodaysMovementRow({ movement }: { movement: DashboardMovementData }) {
  const icon = TYPE_ICON[movement.type as MovementType] ?? NoteIcon
  const { sign, display } = signedQuantity(movement.type as MovementType, movement.quantity)
  const timeLabel = formatRelativeTime(movement.date)

  return (
    <div
      data-testid="todays-movements-row"
      data-type={movement.type}
      className="flex items-center gap-3 px-3 py-2 border-b border-border/50 last:border-b-0"
    >
      <span
        data-slot="todays-movements-type-icon"
        aria-hidden="true"
        className="shrink-0 size-7 rounded-md bg-muted flex items-center justify-center text-muted-foreground"
      >
        <HugeiconsIcon icon={icon} strokeWidth={2} className="size-4" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">
          <span className="text-muted-foreground mr-1.5">{movement.ref}</span>
          {movement.designation}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {movement.document || "\u00a0"}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div
          data-slot="todays-movements-qty"
          className={cn(
            "text-sm font-medium tabular-nums",
            sign === "+" && "text-emerald-600 dark:text-emerald-400",
            sign === "-" && "text-destructive",
          )}
        >
          {sign}
          {display}
        </div>
        <div className="text-xs text-muted-foreground">{timeLabel}</div>
      </div>
    </div>
  )
}

export function TodaysMovements({
  movements,
  maxItems = 8,
  title = "Mouvements du jour",
  description,
  className,
}: TodaysMovementsProps) {
  const displayItems = movements.slice(0, maxItems)

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="p-0">
        {movements.length === 0 ? (
          <div
            data-slot="todays-movements-empty"
            className="flex flex-col items-center justify-center py-8 text-center"
          >
            <div className="rounded-full bg-muted p-4 mb-3">
              <span aria-hidden="true" className="block size-6 text-muted-foreground">
                ⇄
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Aucun mouvement aujourd&apos;hui</p>
            <p className="text-xs text-muted-foreground mt-1">
              Les mouvements de stock s&apos;afficheront ici au fil de la journ&eacute;e.
            </p>
          </div>
        ) : (
          <div data-slot="todays-movements-list">
            {displayItems.map((movement) => (
              <TodaysMovementRow key={movement.id} movement={movement} />
            ))}
            <div className="px-3 pt-1 pb-2">
              <a
                href="/stock?filter=today"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
              >
                Voir tout
                <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
