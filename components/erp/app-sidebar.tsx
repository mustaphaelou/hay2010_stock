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
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { SafeIcon as HugeiconsIcon } from "@/components/ui/safe-icon"
import {
  DashboardSquare01Icon,
  Invoice01Icon,
  ShoppingBag01Icon,
  PackageIcon,
  UserGroupIcon,
  TruckDeliveryIcon,
  Settings01Icon,
  Logout01Icon,
  File01Icon,
  ProductLoadingIcon,
  FolderOpenIcon,
} from "@hugeicons/core-free-icons"
import { logout } from "../../app/actions/auth"

const company = {
    name: "HAY2010",
    plan: "Gestion Commerciale",
    logo: "/hay2010-logo.png",
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
const pathname = usePathname()
const searchParams = useSearchParams()
const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <Sidebar collapsible="icon" {...props}>
                <SidebarHeader>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton size="lg" disabled>
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-muted animate-pulse" />
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                                    <div className="h-3 w-32 bg-muted animate-pulse rounded mt-1" />
                                </div>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarHeader>
                <SidebarContent>
                    <div className="p-4 flex flex-col gap-4">
                        <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                        <div className="flex flex-col gap-2">
                            <div className="h-8 w-full bg-muted animate-pulse rounded" />
                            <div className="h-8 w-full bg-muted animate-pulse rounded" />
                            <div className="h-8 w-full bg-muted animate-pulse rounded" />
                        </div>
                    </div>
                </SidebarContent>
            </Sidebar>
        )
    }

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" className="pointer-events-none">
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg overflow-hidden bg-white">
                                    <Image
                                        src={company.logo}
                                        alt={company.name}
                                        width={32}
                                        height={32}
                                        priority
                                        className="object-contain"
                                    />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">{company.name}</span>
                                    <span className="truncate text-xs">{company.plan}</span>
                                </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Tableau de bord</SidebarGroupLabel>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                tooltip="Vue d&apos;ensemble"
                                isActive={pathname === "/"}
                                render={<Link href="/" />}
                            >
                                <HugeiconsIcon icon={DashboardSquare01Icon} strokeWidth={2} />
                                <span>Vue d&apos;ensemble</span>
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
        <SidebarMenuButton
            tooltip="Configuration"
            isActive={pathname?.startsWith("/settings")}
            render={<Link href="/settings" />}
          >
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
            <SidebarMenuButton
              tooltip="Déconnexion"
              aria-label="Se déconnecter de l'application"
              onClick={async () => {
                await logout()
              }}
            >
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
