"use client"

import * as React from "react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { HugeiconsIcon } from "@hugeicons/react"
import { UserAccountIcon, Building01Icon, UserGroupIcon, Search01Icon } from "@hugeicons/core-free-icons"

export interface PartnerFilterProps {
    partners: string[]
    selectedPartner: string
    onPartnerChange: (partner: string) => void
    selectedType?: string
    onTypeChange?: (type: string) => void
    showTypeFilter?: boolean
}

export function PartnerFilter({
    partners,
    selectedPartner,
    onPartnerChange,
    selectedType = "all",
    onTypeChange,
    showTypeFilter = true,
}: PartnerFilterProps) {
    const [searchValue, setSearchValue] = React.useState("")

    const filteredPartners = React.useMemo(() => {
        if (!searchValue) return partners
        return partners.filter((p) =>
            p.toLowerCase().includes(searchValue.toLowerCase())
        )
    }, [partners, searchValue])

    return (
        <div className="flex flex-col sm:flex-row gap-2 w-full">
            {showTypeFilter && onTypeChange && (
                <div className="w-full sm:w-[180px]">
                    <Select value={selectedType} onValueChange={(value) => onTypeChange(value ?? 'all')}>
                        <SelectTrigger className="h-10">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">
                                <div className="flex items-center gap-2">
                                    <HugeiconsIcon icon={UserGroupIcon} className="h-4 w-4" />
                                    <span>Tous</span>
                                </div>
                            </SelectItem>
                            <SelectItem value="0">
                                <div className="flex items-center gap-2">
                                    <HugeiconsIcon icon={UserAccountIcon} className="h-4 w-4" />
                                    <span>Clients</span>
                                </div>
                            </SelectItem>
                            <SelectItem value="1">
                                <div className="flex items-center gap-2">
                                    <HugeiconsIcon icon={Building01Icon} className="h-4 w-4" />
                                    <span>Fournisseurs</span>
                                </div>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}
            
            <div className="flex-1 min-w-[200px]">
                <Select value={selectedPartner} onValueChange={(value) => onPartnerChange(value ?? 'all')}>
                    <SelectTrigger className="h-10">
                        <div className="flex items-center gap-2">
                            <HugeiconsIcon icon={Search01Icon} className="h-4 w-4 text-muted-foreground" />
                            <SelectValue />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <div className="p-2 pb-0">
                            <Input
                                placeholder="Rechercher..."
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                                className="h-8"
                            />
                        </div>
                        <div className="max-h-[200px] overflow-y-auto">
                            <SelectItem value="all">Tous les partenaires</SelectItem>
                            {filteredPartners.length === 0 ? (
                                <div className="py-2 px-2 text-sm text-muted-foreground text-center">
                                    Aucun partenaire trouvé
                                </div>
                            ) : (
                                filteredPartners.map((partner) => (
                                    <SelectItem key={partner} value={partner}>
                                        {partner}
                                    </SelectItem>
                                ))
                            )}
                        </div>
                    </SelectContent>
                </Select>
            </div>
        </div>
    )
}
