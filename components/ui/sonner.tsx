"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import {
  Tick02Icon,
  InformationCircleIcon,
  Alert01Icon,
  Cancel01Icon,
  Loading02Icon,
} from "@hugeicons/core-free-icons"
import { SafeIcon as HugeiconsIcon } from "@/components/ui/safe-icon"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <HugeiconsIcon icon={Tick02Icon} className="size-4" />,
        info: <HugeiconsIcon icon={InformationCircleIcon} className="size-4" />,
        warning: <HugeiconsIcon icon={Alert01Icon} className="size-4" />,
        error: <HugeiconsIcon icon={Cancel01Icon} className="size-4" />,
        loading: <HugeiconsIcon icon={Loading02Icon} className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
