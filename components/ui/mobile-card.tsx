"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface MobileCardField {
    /** Field label */
    label: string
    /** Field value */
    value: React.ReactNode
    /** Whether this field should be highlighted/primary */
    primary?: boolean
    /** Optional className for the field container */
    className?: string
}

interface MobileCardProps {
    /** Title/primary text for the card */
    title: React.ReactNode
    /** Subtitle/secondary text */
    subtitle?: React.ReactNode
    /** Badge element to display in the header */
    badge?: React.ReactNode
    /** Array of fields to display in the card body */
    fields?: MobileCardField[]
    /** Actions to display (usually dropdown menu or buttons) */
    actions?: React.ReactNode
    /** Click handler for the entire card */
    onClick?: () => void
    /** Additional className */
    className?: string
}

/**
 * Mobile-optimized card component for displaying data that would normally be in a table row.
 * Use this instead of table rows on mobile for better touch interaction.
 */
export function MobileCard({
    title,
    subtitle,
    badge,
    fields,
    actions,
    onClick,
    className,
}: MobileCardProps) {
    const CardWrapper = onClick ? "button" : "div"

    return (
        <Card
            className={cn(
                "transition-colors",
                onClick && "cursor-pointer hover:bg-muted/50 active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                className
            )}
        >
            <CardContent className="p-4">
                <CardWrapper
                    onClick={onClick}
                    className={cn(
                        "w-full text-left",
                        onClick && "focus-visible:outline-none"
                    )}
                    {...(onClick && { type: "button" as const })}
                >
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                {badge}
                                <h3 className="font-semibold text-base truncate">
                                    {title}
                                </h3>
                            </div>
                            {subtitle && (
                                <p className="text-sm text-muted-foreground truncate">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                        {actions && (
                            <div
                                className="flex-shrink-0"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {actions}
                            </div>
                        )}
                    </div>

                    {/* Fields Grid */}
                    {fields && fields.length > 0 && (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 border-t">
                            {fields.map((field, index) => (
                                <div
                                    key={index}
                                    className={cn(
                                        "min-w-0",
                                        field.className
                                    )}
                                >
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                                        {field.label}
                                    </p>
                                    <p className={cn(
                                        "text-sm truncate",
                                        field.primary && "font-semibold text-primary"
                                    )}>
                                        {field.value || "-"}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </CardWrapper>
            </CardContent>
        </Card>
    )
}

interface MobileCardListProps<T> {
    /** Data items to render */
    data: T[]
    /** Render function for each card */
    renderCard: (item: T, index: number) => React.ReactNode
    /** Loading state */
    loading?: boolean
    /** Number of skeleton cards to show when loading */
    skeletonCount?: number
    /** Empty state message */
    emptyMessage?: string
    /** Additional className for the list container */
    className?: string
}

/**
 * Container component for rendering a list of mobile cards with loading and empty states.
 */
export function MobileCardList<T>({
    data,
    renderCard,
    loading = false,
    skeletonCount = 5,
    emptyMessage = "Aucun élément trouvé",
    className,
}: MobileCardListProps<T>) {
    if (loading) {
        return (
            <div className={cn("space-y-3", className)}>
                {Array.from({ length: skeletonCount }).map((_, i) => (
                    <Card key={i} className="animate-pulse">
                        <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-muted rounded w-1/3" />
                                    <div className="h-5 bg-muted rounded w-2/3" />
                                </div>
                                <div className="h-8 w-8 bg-muted rounded" />
                            </div>
                            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                                <div className="space-y-1">
                                    <div className="h-3 bg-muted rounded w-1/2" />
                                    <div className="h-4 bg-muted rounded w-3/4" />
                                </div>
                                <div className="space-y-1">
                                    <div className="h-3 bg-muted rounded w-1/2" />
                                    <div className="h-4 bg-muted rounded w-3/4" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    if (data.length === 0) {
        return (
            <div className={cn("text-center py-12 text-muted-foreground", className)}>
                <p>{emptyMessage}</p>
            </div>
        )
    }

    return (
        <div className={cn("space-y-3", className)}>
            {data.map((item, index) => renderCard(item, index))}
        </div>
    )
}
