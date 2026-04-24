"use client"

import { usePathname } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ModeToggle } from "@/components/mode-toggle"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const breadcrumbLabels: Record<string, string> = {
    "/": "Tableau de bord",
    "/sales": "Ventes",
    "/stock": "Niveaux de Stock",
    "/articles": "Articles",
    "/documents": "Documents",
    "/purchases": "Achats",
    "/affaires": "Interrogation Affaire",
    "/partners": "Tiers",
    "/settings": "Paramètres",
}

export function SiteHeader() {
    const pathname = usePathname()
    const pageTitle = breadcrumbLabels[pathname] ?? "Tableau de bord"

    return (
        <header className="flex h-14 sm:h-14 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur-sm px-3 sm:px-4 sticky top-0 z-10 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            {/* Larger touch target for sidebar toggle on mobile */}
            <SidebarTrigger className="-ml-1 size-10 sm:size-8" />
            <Separator orientation="vertical" className="mr-1 sm:mr-2 h-4 hidden sm:block" />
            {/* Breadcrumbs - simplified on mobile */}
            <Breadcrumb className="flex-1 min-w-0">
                <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                        <BreadcrumbLink href="#">HAY2010</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem className="truncate">
                        <BreadcrumbPage className="text-sm sm:text-base truncate">{pageTitle}</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            {/* Actions - compact on mobile */}
            <div className="ml-auto flex items-center gap-2 sm:gap-4 flex-shrink-0">
                <div className="flex items-center gap-1 sm:gap-2">
<ModeToggle />
                </div>
                <Avatar size="sm" className="size-8 sm:size-9">
                    <AvatarImage src="/hay2010-logo.png" alt="User" />
                    <AvatarFallback>ML</AvatarFallback>
                </Avatar>
            </div>
        </header>
    )
}
