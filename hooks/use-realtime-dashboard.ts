"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import { RealtimeChannel } from "@supabase/supabase-js"

interface DashboardStats {
    clients: number
    suppliers: number
    products: number
    families: number
    salesCount: number
    purchasesCount: number
}

interface RealtimeDashboardOptions {
    onStatsUpdate?: (stats: Partial<DashboardStats>) => void
    onDocumentInsert?: (document: Record<string, unknown>) => void
    onDocumentUpdate?: (document: Record<string, unknown>) => void
    onPartnerInsert?: (partner: Record<string, unknown>) => void
    onProductInsert?: (product: Record<string, unknown>) => void
    enabled?: boolean
}

interface RealtimeDashboardReturn {
    isConnected: boolean
    lastUpdate: Date | null
    error: Error | null
    reconnect: () => void
}

export function useRealtimeDashboard({
    onStatsUpdate,
    onDocumentInsert,
    onDocumentUpdate,
    onPartnerInsert,
    onProductInsert,
    enabled = true,
}: RealtimeDashboardOptions = {}): RealtimeDashboardReturn {
    const [isConnected, setIsConnected] = React.useState(false)
    const [lastUpdate, setLastUpdate] = React.useState<Date | null>(null)
    const [error, setError] = React.useState<Error | null>(null)
    const channelRef = React.useRef<RealtimeChannel | null>(null)
    const supabase = createClient()

    const setupChannel = React.useCallback(() => {
        if (!enabled) return

        const channel = supabase
            .channel("dashboard-realtime")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "documents",
                },
                (payload) => {
                    setLastUpdate(new Date())
                    onDocumentInsert?.(payload.new as Record<string, unknown>)
                    // Update sales/purchases count based on document type
                    onStatsUpdate?.({
                        salesCount: payload.new?.domaine_document === "VENTE" ? 1 : 0,
                        purchasesCount: payload.new?.domaine_document === "ACHAT" ? 1 : 0,
                    })
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "documents",
                },
                (payload) => {
                    setLastUpdate(new Date())
                    onDocumentUpdate?.(payload.new as Record<string, unknown>)
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "partenaires",
                },
                (payload) => {
                    setLastUpdate(new Date())
                    onPartnerInsert?.(payload.new as Record<string, unknown>)
                    // Update partner count based on type
                    const partnerType = payload.new?.type_partenaire
                    onStatsUpdate?.({
                        clients: partnerType === "CLIENT" ? 1 : 0,
                        suppliers: partnerType === "FOURNISSEUR" ? 1 : 0,
                    })
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "produits",
                },
                (payload) => {
                    setLastUpdate(new Date())
                    onProductInsert?.(payload.new as Record<string, unknown>)
                    onStatsUpdate?.({ products: 1 })
                }
            )
            .subscribe((status) => {
                setIsConnected(status === "SUBSCRIBED")
                if (status === "CHANNEL_ERROR") {
                    setError(new Error("Realtime connection error"))
                } else {
                    setError(null)
                }
            })

        channelRef.current = channel

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current)
                channelRef.current = null
            }
        }
    }, [enabled, onDocumentInsert, onDocumentUpdate, onPartnerInsert, onProductInsert, onStatsUpdate, supabase])

    React.useEffect(() => {
        const cleanup = setupChannel()
        return cleanup
    }, [setupChannel])

    const reconnect = React.useCallback(() => {
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current)
        }
        setupChannel()
    }, [setupChannel, supabase])

    return {
        isConnected,
        lastUpdate,
        error,
        reconnect,
    }
}

// Hook for real-time presence (showing active users)
export function useDashboardPresence(roomId: string = "dashboard") {
    const [activeUsers, setActiveUsers] = React.useState<
        Array<{ id: string; name: string; avatar?: string }>
    >([])
    const supabase = createClient()

    React.useEffect(() => {
        const channel = supabase.channel(`presence:${roomId}`, {
            config: {
                presence: {
                    key: "user",
                },
            },
        })

        channel
            .on("presence", { event: "sync" }, () => {
                const state = channel.presenceState()
                const users = Object.values(state)
                    .flat()
                    .map((p: unknown) => p as { id: string; name: string; avatar?: string })
                setActiveUsers(users)
            })
            .subscribe(async (status) => {
                if (status === "SUBSCRIBED") {
                    await channel.track({
                        id: crypto.randomUUID(),
                        name: "User",
                    })
                }
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [roomId, supabase])

    return { activeUsers }
}

export type { DashboardStats, RealtimeDashboardOptions, RealtimeDashboardReturn }
