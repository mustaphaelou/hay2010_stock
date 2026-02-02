"use client"

import * as React from "react"
import { Globe02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function LanguageToggle() {
    const [language, setLanguage] = React.useState("EN")
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <Button variant="outline" size="icon">
                <HugeiconsIcon icon={Globe02Icon} className="h-[1.2rem] w-[1.2rem]" />
                <span className="sr-only">Toggle language</span>
            </Button>
        )
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button variant="outline" size="icon">
                        <HugeiconsIcon icon={Globe02Icon} className="h-[1.2rem] w-[1.2rem]" />
                        <span className="sr-only">Toggle language</span>
                    </Button>
                }
            />
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLanguage("EN")}>
                    English {language === "EN" && "✓"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage("FR")}>
                    Français {language === "FR" && "✓"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage("AR")}>
                    العربية {language === "AR" && "✓"}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
