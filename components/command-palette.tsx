"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command"
import { HugeiconsIcon } from "@hugeicons/react"
import {
    DashboardSquare01Icon,
    PackageIcon,
    UserGroupIcon,
    Store01Icon,
    Invoice01Icon,
    ChartUpIcon,
    Analytics01Icon,
    Settings01Icon,
    Search01Icon,
    Briefcase01Icon,
} from "@hugeicons/core-free-icons"

interface CommandPaletteProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
    const router = useRouter()

    const runCommand = React.useCallback((command: () => void) => {
        onOpenChange(false)
        command()
    }, [onOpenChange])

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                onOpenChange(!open)
            }
        }

        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [open, onOpenChange])

    return (
        <CommandDialog
            open={open}
            onOpenChange={onOpenChange}
            title="Recherche rapide"
            description="Recherchez une page ou une action"
        >
            <CommandInput placeholder="Rechercher une page, un produit, un partenaire..." />
            <CommandList>
                <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>

                <CommandGroup heading="Navigation">
                    <CommandItem
                        onSelect={() => runCommand(() => router.push("/"))}
                    >
                        <HugeiconsIcon icon={DashboardSquare01Icon} className="mr-2 h-4 w-4" />
                        <span>Tableau de bord</span>
                        <CommandShortcut>⌘D</CommandShortcut>
                    </CommandItem>
                    <CommandItem
                        onSelect={() => runCommand(() => router.push("/articles"))}
                    >
                        <HugeiconsIcon icon={PackageIcon} className="mr-2 h-4 w-4" />
                        <span>Produits</span>
                        <CommandShortcut>⌘P</CommandShortcut>
                    </CommandItem>
                    <CommandItem
                        onSelect={() => runCommand(() => router.push("/partners"))}
                    >
                        <HugeiconsIcon icon={UserGroupIcon} className="mr-2 h-4 w-4" />
                        <span>Partenaires</span>
                    </CommandItem>
                    <CommandItem
                        onSelect={() => runCommand(() => router.push("/stock"))}
                    >
                        <HugeiconsIcon icon={Store01Icon} className="mr-2 h-4 w-4" />
                        <span>Stock</span>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Documents">
                    <CommandItem
                        onSelect={() => runCommand(() => router.push("/documents"))}
                    >
                        <HugeiconsIcon icon={Invoice01Icon} className="mr-2 h-4 w-4" />
                        <span>Documents</span>
                    </CommandItem>
                    <CommandItem
                        onSelect={() => runCommand(() => router.push("/affaires"))}
                    >
                        <HugeiconsIcon icon={Briefcase01Icon} className="mr-2 h-4 w-4" />
                        <span>Affaires</span>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Rapports">
                    <CommandItem
                        onSelect={() => runCommand(() => router.push("/statistics"))}
                    >
                        <HugeiconsIcon icon={Analytics01Icon} className="mr-2 h-4 w-4" />
                        <span>Statistiques</span>
                    </CommandItem>
                    <CommandItem
                        onSelect={() => runCommand(() => router.push("/movements"))}
                    >
                        <HugeiconsIcon icon={ChartUpIcon} className="mr-2 h-4 w-4" />
                        <span>Mouvements de stock</span>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Paramètres">
                    <CommandItem
                        onSelect={() => runCommand(() => router.push("/settings"))}
                    >
                        <HugeiconsIcon icon={Settings01Icon} className="mr-2 h-4 w-4" />
                        <span>Paramètres</span>
                        <CommandShortcut>⌘,</CommandShortcut>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    )
}

// Search trigger button for the header
export function CommandPaletteTrigger({ onClick }: { onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-md border border-input bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
            <HugeiconsIcon icon={Search01Icon} className="size-4" />
            <span className="hidden lg:inline-flex">Rechercher...</span>
            <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground lg:inline-flex">
                <span className="text-xs">⌘</span>K
            </kbd>
        </button>
    )
}
