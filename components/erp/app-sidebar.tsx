"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useSearchParams } from "next/navigation"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    useSidebar,
} from "@/components/ui/sidebar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { HugeiconsIcon } from "@hugeicons/react"
import {
    DashboardSquare01Icon,
    Invoice01Icon,
    ShoppingBag01Icon,
    PackageIcon,
    UserGroupIcon,
    TruckDeliveryIcon,
    Settings01Icon,
    Logout01Icon,
    MoreVerticalIcon,
    File01Icon,
    ProductLoadingIcon,
    FolderOpenIcon,
} from "@hugeicons/core-free-icons"

// Company switcher data
const companies = [
    {
        name: "HAY2010",
        plan: "Gestion Commerciale",
        logo: "/hay2010-logo.png",
    },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const { state } = useSidebar()

    const [activeCompany, setActiveCompany] = React.useState(companies[0])

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <SidebarMenuButton
                                size="lg"
                                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                                render={<DropdownMenuTrigger />}
                            >
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg overflow-hidden bg-white">
                                    <Image
                                        src={activeCompany.logo}
                                        alt={activeCompany.name}
                                        width={32}
                                        height={32}
                                        className="object-contain"
                                    />
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
                                {companies.map((company) => (
                                    <DropdownMenuItem
                                        key={company.name}
                                        onClick={() => setActiveCompany(company)}
                                        className="gap-2 p-2"
                                    >
                                        <div className="flex size-6 items-center justify-center rounded-sm border overflow-hidden bg-white">
                                            <Image
                                                src={company.logo}
                                                alt={company.name}
                                                width={24}
                                                height={24}
                                                className="object-contain"
                                            />
                                        </div>
                                        {company.name}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Tableau de bord</SidebarGroupLabel>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                tooltip="Vue d'ensemble"
                                isActive={pathname === "/"}
                                render={<Link href="/" />}
                            >
                                <HugeiconsIcon icon={DashboardSquare01Icon} strokeWidth={2} />
                                <span>Vue d'ensemble</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel>Gestion</SidebarGroupLabel>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                tooltip="Ventes"
                                isActive={pathname?.startsWith("/sales")}
                                render={<Link href="/sales" />}
                            >
                                <HugeiconsIcon icon={Invoice01Icon} strokeWidth={2} />
                                <span>Ventes</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                tooltip="Achats"
                                isActive={pathname?.startsWith("/purchases")}
                                render={<Link href="/purchases" />}
                            >
                                <HugeiconsIcon icon={ShoppingBag01Icon} strokeWidth={2} />
                                <span>Achats</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                tooltip="Stock"
                                isActive={pathname?.startsWith("/stock")}
                                render={<Link href="/stock" />}
                            >
                                <HugeiconsIcon icon={PackageIcon} strokeWidth={2} />
                                <span>Stock</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                tooltip="Articles"
                                isActive={pathname?.startsWith("/articles")}
                                render={<Link href="/articles" />}
                            >
                                <HugeiconsIcon icon={ProductLoadingIcon} strokeWidth={2} />
                                <span>Articles</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                tooltip="Documents"
                                isActive={pathname?.startsWith("/documents")}
                                render={<Link href="/documents" />}
                            >
                                <HugeiconsIcon icon={File01Icon} strokeWidth={2} />
                                <span>Documents</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                tooltip="Affaires"
                                isActive={pathname?.startsWith("/affaires")}
                                render={<Link href="/affaires" />}
                            >
                                <HugeiconsIcon icon={FolderOpenIcon} strokeWidth={2} />
                                <span>Affaires</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel>Tiers</SidebarGroupLabel>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                tooltip="Clients"
                                isActive={pathname === "/partners" && searchParams.get("tab") !== "suppliers"}
                                render={<Link href="/partners?tab=clients" />}
                            >
                                <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} />
                                <span>Clients</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                tooltip="Fournisseurs"
                                isActive={pathname === "/partners" && searchParams.get("tab") === "suppliers"}
                                render={<Link href="/partners?tab=suppliers" />}
                            >
                                <HugeiconsIcon icon={TruckDeliveryIcon} strokeWidth={2} />
                                <span>Fournisseurs</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>
                <SidebarGroup>
                    <SidebarGroupLabel>Paramètres</SidebarGroupLabel>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton tooltip="Configuration">
                                <HugeiconsIcon icon={Settings01Icon} strokeWidth={2} />
                                <span>Configuration</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton tooltip="Déconnexion" aria-label="Se déconnecter de l'application">
                            <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} aria-hidden="true" />
                            <span>Déconnexion</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
