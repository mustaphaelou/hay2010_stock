'use client'

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface DocumentType {
    id: string | number
    label: string
    count?: number
}

interface DocumentTypeSelectorProps {
    types: DocumentType[]
    selectedType: string | number
    onTypeChange: (type: string | number) => void
    className?: string
}

export function DocumentTypeSelector({
    types,
    selectedType,
    onTypeChange,
    className
}: DocumentTypeSelectorProps) {
    return (
        <div className={cn("w-64 border-r bg-muted/10 flex flex-col h-full", className)}>
            <div className="p-4 border-b">
                <h3 className="font-semibold text-sm">Types de documents</h3>
            </div>
            <div className="flex-1 px-2 py-4 overflow-y-auto no-scrollbar">
                <div className="space-y-1">
                    <Button
                        variant={selectedType === 'all' ? "secondary" : "ghost"}
                        className={cn(
                            "w-full justify-start font-normal",
                            selectedType === 'all' && "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                        )}
                        onClick={() => onTypeChange('all')}
                    >
                        Tous les documents
                    </Button>
                    <div className="h-px bg-border my-2" />
                    {types.map((type) => (
                        <Button
                            key={type.id}
                            variant={selectedType === type.id ? "secondary" : "ghost"}
                            className={cn(
                                "w-full justify-start font-normal",
                                selectedType === type.id && "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                            )}
                            onClick={() => onTypeChange(type.id)}
                        >
                            <span className="flex-1 text-left">{type.label}</span>
                            {type.count !== undefined && (
                                <span className="ml-2 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                                    {type.count}
                                </span>
                            )}
                        </Button>
                    ))}
                </div>
            </div>
        </div>
    )
}
