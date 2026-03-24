"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { cn } from "@/lib/utils"
import type { IconSvgElement } from "@hugeicons/react"

interface EmptyProps {
  title?: string
  description?: string
  icon?: IconSvgElement
  action?: React.ReactNode
  className?: string
}

export function Empty({
  title = "Aucune donnée",
  description = "Il n'y a rien à afficher pour le moment.",
  icon: Icon,
  action,
  className,
}: EmptyProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      {Icon && (
        <div className="mb-4 rounded-full bg-muted p-4">
          <HugeiconsIcon
            icon={Icon}
            className="h-8 w-8 text-muted-foreground"
            strokeWidth={1.5}
          />
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
