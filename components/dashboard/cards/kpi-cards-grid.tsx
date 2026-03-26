"use client"

import * as React from "react"
import { KPICard, type KPICardProps } from "./kpi-card"
import { cn } from "@/lib/utils"

interface KPIConfig extends Omit<KPICardProps, "value"> {
    id: string
    value: number | string
    href?: string
    onClick?: () => void
}

interface KPICardsGridProps {
    cards: KPIConfig[]
    columns?: 2 | 3 | 4 | 6
    loading?: boolean
    className?: string
    animated?: boolean
}

const gridColsMap = {
    2: "grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-3",
    4: "grid-cols-2 lg:grid-cols-4",
    6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
}

export function KPICardsGrid({
    cards,
    columns = 4,
    loading = false,
    className,
    animated = true,
}: KPICardsGridProps) {
    return (
        <div
            className={cn(
                "grid gap-4",
                gridColsMap[columns],
                "stagger-children",
                className
            )}
        >
            {cards.map((card, index) => (
                <div
                    key={card.id}
                    style={{ "--index": index } as React.CSSProperties}
                    className="animate-fade-in-up"
                >
                    {card.href ? (
                        <a href={card.href} className="block">
                            <KPICard
                                title={card.title}
                                value={card.value}
                                description={card.description}
                                icon={card.icon}
                                iconColor={card.iconColor}
                                trend={card.trend}
                                variant={card.variant}
                                size={card.size}
                                loading={loading}
                                animated={animated}
                                sparklineData={card.sparklineData}
                                className="cursor-pointer"
                            />
                        </a>
                    ) : card.onClick ? (
                        <button
                            onClick={card.onClick}
                            className="w-full text-left"
                            type="button"
                            aria-label={card.title}
                        >
                            <KPICard
                                title={card.title}
                                value={card.value}
                                description={card.description}
                                icon={card.icon}
                                iconColor={card.iconColor}
                                trend={card.trend}
                                variant={card.variant}
                                size={card.size}
                                loading={loading}
                                animated={animated}
                                sparklineData={card.sparklineData}
                                className="cursor-pointer"
                            />
                        </button>
                    ) : (
                        <KPICard
                            title={card.title}
                            value={card.value}
                            description={card.description}
                            icon={card.icon}
                            iconColor={card.iconColor}
                            trend={card.trend}
                            variant={card.variant}
                            size={card.size}
                            loading={loading}
                            animated={animated}
                            sparklineData={card.sparklineData}
                        />
                    )}
                </div>
            ))}
        </div>
    )
}

export type { KPIConfig, KPICardsGridProps }
