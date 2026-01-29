"use client"

import * as React from "react"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ModeToggle } from "@/components/mode-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { CommandPalette, CommandPaletteTrigger } from "@/components/command-palette"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarTrigger,
    SidebarRail,
} from "@/components/ui/sidebar"
import { HugeiconsIcon } from "@hugeicons/react"
import {
    LayersIcon,
    Settings01Icon,
    MoreVerticalIcon,
    PackageIcon,
    UserGroupIcon,
    Invoice01Icon,
    Store01Icon,
    DashboardSquare01Icon,
    ShoppingBag01Icon,
    TruckDeliveryIcon,
    ChartUpIcon,
    File01Icon,
    Analytics01Icon,
    Calculator01Icon,
    Briefcase01Icon,
} from "@hugeicons/core-free-icons"

interface AppLayoutProps {
    children: React.ReactNode
    title?: string
    breadcrumb?: string
}

import { Suspense } from "react"

export function AppLayout({ children, title = "Tableau de bord", breadcrumb }: AppLayoutProps) {
    const [commandOpen, setCommandOpen] = useState(false)

    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "280px",
                    "--header-height": "3.5rem",
                } as React.CSSProperties
            }
        >
            <Suspense>
                <AppSidebar variant="sidebar" collapsible="icon" />
            </Suspense>
            <SidebarInset>
                <SiteHeader
                    title={title}
                    breadcrumb={breadcrumb}
                    onSearchClick={() => setCommandOpen(true)}
                />
                <div className="flex flex-1 flex-col p-6 md:p-8 gap-8 bg-muted/20">
                    {children}
                </div>
            </SidebarInset>
            <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
        </SidebarProvider>
    )
}

function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname()

    const structureItems = [
        { title: "Produits", url: "/articles", icon: PackageIcon },
        { title: "Clients & Fournisseurs", url: "/partners", icon: UserGroupIcon },
        { title: "Dépôts de stockage", url: "/stock", icon: Store01Icon },
    ]

    const processingItems = [
        { title: "Affaires", url: "/affaires", icon: Briefcase01Icon },
        { title: "Documents", url: "/documents", icon: Invoice01Icon },
        { title: "Mouvements de stock", url: "/movements", icon: ChartUpIcon },
    ]

    const reportItems = [
        { title: "Statistiques", url: "/statistics", icon: Analytics01Icon },
    ]

    const user = {
        name: "Administrateur",
        email: "admin@societe.com",
        avatar: "/avatars/admin.jpg",
    }

    const [activeCompany, setActiveCompany] = React.useState({
        name: "HAY2010",
        plan: "Gestion Commerciale",
        logo: LayersIcon,
    })

    const companies = [
        { name: "HAY2010", plan: "Gestion Commerciale", logo: LayersIcon },
        { name: "VOLTRAVE", plan: "Gestion Commerciale", logo: LayersIcon },
        { name: "ECLANOUR", plan: "Gestion Commerciale", logo: LayersIcon },
    ]

    return (
        <Sidebar {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <SidebarMenuButton
                                size="lg"
                                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                                render={<DropdownMenuTrigger />}
                            >
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                    <HugeiconsIcon icon={activeCompany.logo} className="size-4" />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">{activeCompany.name}</span>
                                    <span className="truncate text-xs">{activeCompany.plan}</span>
                                </div>
                                <HugeiconsIcon icon={MoreVerticalIcon} strokeWidth={2} className="ml-auto" />
                            </SidebarMenuButton>
                            <DropdownMenuContent
                                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                                align="start"
                                side="bottom"
                                sideOffset={4}
                            >
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                                        Sociétés
                                    </DropdownMenuLabel>
                                    {companies.map((company) => (
                                        <DropdownMenuItem
                                            key={company.name}
                                            onClick={() => setActiveCompany(company)}
                                            className="gap-2 p-2"
                                        >
                                            <div className="flex size-6 items-center justify-center rounded-sm border">
                                                <HugeiconsIcon icon={company.logo} className="size-4 shrink-0" />
                                            </div>
                                            {company.name}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <NavGroup
                    title="Navigation"
                    items={[{ title: "Tableau de bord", url: "/", icon: DashboardSquare01Icon }]}
                    currentPath={pathname}
                />
                <NavGroup title="Structure" items={structureItems} currentPath={pathname} />
                <NavGroup title="Traitement" items={processingItems} currentPath={pathname} />
                <NavGroup title="Etats" items={reportItems} currentPath={pathname} />
            </SidebarContent>
            <SidebarFooter>
                <NavUser user={user} />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}

function NavGroup({ title, items, currentPath }: {
    title: string,
    items: { title: string, url: string, icon: any }[],
    currentPath: string
}) {
    return (
        <SidebarGroup>
            <SidebarGroupLabel>{title}</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => {
                    const isActive = currentPath === item.url ||
                        (item.url !== "/" && currentPath.startsWith(item.url))
                    return (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                tooltip={item.title}
                                render={<Link href={item.url} />}
                                isActive={isActive}
                            >
                                <HugeiconsIcon icon={item.icon} strokeWidth={2} />
                                <span>{item.title}</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )
                })}
            </SidebarMenu>
        </SidebarGroup>
    )
}

function NavUser({ user }: { user: { name: string; email: string; avatar: string } }) {
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <SidebarMenuButton
                        size="lg"
                        className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        render={<DropdownMenuTrigger />}
                    >
                        <Avatar className="h-8 w-8 rounded-lg">
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback className="rounded-lg">AD</AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                            <span className="truncate font-semibold">{user.name}</span>
                            <span className="truncate text-xs">{user.email}</span>
                        </div>
                        <HugeiconsIcon icon={MoreVerticalIcon} strokeWidth={2} className="ml-auto size-4" />
                    </SidebarMenuButton>
                    <DropdownMenuContent
                        className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                        side="bottom"
                        align="end"
                        sideOffset={4}
                    >
                        <DropdownMenuGroup>
                            <DropdownMenuLabel className="p-0 font-normal">
                                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                    <Avatar className="h-8 w-8 rounded-lg">
                                        <AvatarImage src={user.avatar} alt={user.name} />
                                        <AvatarFallback className="rounded-lg">AD</AvatarFallback>
                                    </Avatar>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-semibold">{user.name}</span>
                                        <span className="truncate text-xs">{user.email}</span>
                                    </div>
                                </div>
                            </DropdownMenuLabel>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem>
                                <HugeiconsIcon icon={Settings01Icon} strokeWidth={2} className="mr-2" />
                                Paramètres
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}

function SiteHeader({ title, breadcrumb, onSearchClick }: { title?: string, breadcrumb?: string, onSearchClick?: () => void }) {
    return (
        <header className="flex h-[--header-height] shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-lg px-4 sticky top-0 z-40">
            <div className="flex w-full items-center gap-2">
                <SidebarTrigger className="-ml-2 hover:bg-primary/10 transition-colors" />
                <Separator orientation="vertical" className="mr-2 h-4" />

                {/* Enhanced Breadcrumb Navigation */}
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <Link href="/" className="font-semibold gradient-text hover:opacity-80 transition-opacity">
                                    Gestion Commerciale
                                </Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>{breadcrumb || title}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>

                <div className="ml-auto flex items-center gap-2">
                    {onSearchClick && (
                        <CommandPaletteTrigger onClick={onSearchClick} />
                    )}
                    <LanguageToggle />
                    <ModeToggle />
                </div>
            </div>
        </header>
    )
}

export { AppSidebar, SiteHeader, NavGroup, NavUser }
