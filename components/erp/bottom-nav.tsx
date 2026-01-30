"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import {
    DashboardSquare01Icon,
    ProductLoadingIcon,
    UserGroupIcon,
    Invoice01Icon,
    Settings01Icon,
} from "@hugeicons/core-free-icons"

const navItems = [
    {
        label: "Accueil",
        href: "/",
        icon: DashboardSquare01Icon,
    },
    {
        label: "Articles",
        href: "/articles",
        icon: ProductLoadingIcon,
    },
    {
        label: "Tiers",
        href: "/partners",
        icon: UserGroupIcon,
    },
    {
        label: "Ventes",
        href: "/sales",
        icon: Invoice01Icon,
    },
    {
        label: "Plus",
        href: "/settings",
        icon: Settings01Icon,
    },
]

export function BottomNav() {
    const pathname = usePathname()

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-md border-t border-border pb-[env(safe-area-inset-bottom)]"
            role="navigation"
            aria-label="Navigation principale"
        >
            <div className="flex items-stretch justify-around h-16">
                {navItems.map((item) => {
                    const isActive = pathname === item.href ||
                        (item.href !== "/" && pathname?.startsWith(item.href))

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 flex-1 min-w-0 px-1 py-2 transition-colors touch-action-manipulation",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md mx-1",
                                isActive
                                    ? "text-primary"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                            aria-current={isActive ? "page" : undefined}
                        >
                            <div className="relative">
                                <HugeiconsIcon
                                    icon={item.icon}
                                    className={cn(
                                        "h-5 w-5 transition-transform",
                                        isActive && "scale-110"
                                    )}
                                    strokeWidth={isActive ? 2.5 : 2}
                                    aria-hidden="true"
                                />
                                {isActive && (
                                    <span
                                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                                        aria-hidden="true"
                                    />
                                )}
                            </div>
                            <span className={cn(
                                "text-[10px] font-medium truncate max-w-full",
                                isActive && "font-semibold"
                            )}>
                                {item.label}
                            </span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
