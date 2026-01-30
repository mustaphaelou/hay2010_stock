"use client"

import * as React from "react"
import { BottomNav } from "@/components/erp/bottom-nav"

interface MobileLayoutWrapperProps {
    children: React.ReactNode
    /** Whether to show bottom navigation (default: true) */
    showBottomNav?: boolean
}

/**
 * Wrapper component that adds mobile-specific UI elements like bottom navigation.
 * Use this as a wrapper inside pages that need mobile enhancements.
 */
export function MobileLayoutWrapper({
    children,
    showBottomNav = true
}: MobileLayoutWrapperProps) {
    return (
        <>
            {/* Add bottom padding to prevent content from being hidden behind bottom nav */}
            <div className="pb-16 md:pb-0">
                {children}
            </div>
            {showBottomNav && <BottomNav />}
        </>
    )
}
