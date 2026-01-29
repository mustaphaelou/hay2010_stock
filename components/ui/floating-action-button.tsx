"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { Add01Icon, Cancel01Icon } from "@hugeicons/core-free-icons"

interface FABAction {
    label: string
    icon: IconSvgElement
    onClick: () => void
}

interface FloatingActionButtonProps {
    /** Primary action when FAB is clicked (or when there are no sub-actions) */
    onPrimaryClick?: () => void
    /** Primary action label for accessibility */
    primaryLabel?: string
    /** Optional sub-actions that expand when FAB is clicked */
    actions?: FABAction[]
    /** Custom icon for primary button */
    icon?: IconSvgElement
    /** Additional className */
    className?: string
}

export function FloatingActionButton({
    onPrimaryClick,
    primaryLabel = "Action",
    actions,
    icon: CustomIcon,
    className,
}: FloatingActionButtonProps) {
    const [isOpen, setIsOpen] = React.useState(false)
    const hasActions = actions && actions.length > 0

    const handlePrimaryClick = () => {
        if (hasActions) {
            setIsOpen(!isOpen)
        } else if (onPrimaryClick) {
            onPrimaryClick()
        }
    }

    const handleActionClick = (action: FABAction) => {
        action.onClick()
        setIsOpen(false)
    }

    // Close on escape key
    React.useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                setIsOpen(false)
            }
        }
        window.addEventListener("keydown", handleEscape)
        return () => window.removeEventListener("keydown", handleEscape)
    }, [isOpen])

    return (
        <div
            className={cn(
                "fixed bottom-20 right-4 z-40 md:hidden",
                "pb-[env(safe-area-inset-bottom)]",
                className
            )}
        >
            {/* Backdrop when expanded */}
            {isOpen && hasActions && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
                    onClick={() => setIsOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Sub-actions */}
            {isOpen && hasActions && (
                <div className="flex flex-col-reverse gap-3 mb-3 stagger-children">
                    {actions.map((action, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-end gap-2"
                        >
                            <span className="bg-background/95 backdrop-blur-sm px-3 py-1.5 rounded-md text-sm font-medium shadow-md border">
                                {action.label}
                            </span>
                            <Button
                                size="icon"
                                variant="secondary"
                                className="h-12 w-12 rounded-full shadow-lg"
                                onClick={() => handleActionClick(action)}
                                aria-label={action.label}
                            >
                                <HugeiconsIcon
                                    icon={action.icon}
                                    className="h-5 w-5"
                                    aria-hidden="true"
                                />
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            {/* Primary FAB */}
            <Button
                size="icon"
                className={cn(
                    "h-14 w-14 rounded-full shadow-lg transition-transform",
                    "hover:scale-105 active:scale-95",
                    "bg-primary hover:bg-primary/90",
                    isOpen && "rotate-45"
                )}
                onClick={handlePrimaryClick}
                aria-label={hasActions ? (isOpen ? "Fermer le menu" : "Ouvrir le menu d'actions") : primaryLabel}
                aria-expanded={hasActions ? isOpen : undefined}
            >
                <HugeiconsIcon
                    icon={isOpen && hasActions ? Cancel01Icon : (CustomIcon || Add01Icon)}
                    className="h-6 w-6 transition-transform"
                    strokeWidth={2.5}
                    aria-hidden="true"
                />
            </Button>
        </div>
    )
}
