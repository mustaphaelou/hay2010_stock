"use client"

import * as React from "react"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { isValidIcon } from "@/lib/utils"

interface SafeIconProps extends Omit<React.ComponentProps<typeof HugeiconsIcon>, 'icon'> {
  icon: IconSvgElement | undefined | null
  fallback?: IconSvgElement
}

/**
 * Safe wrapper for HugeiconsIcon that prevents "currentIcon is not iterable" errors
 * by validating the icon prop before rendering.
 */
export function SafeIcon({ icon, fallback, ...props }: SafeIconProps) {
  if (!isValidIcon(icon)) {
    if (fallback && isValidIcon(fallback)) {
      return <HugeiconsIcon icon={fallback} {...props} />
    }
    return null
  }
  
  return <HugeiconsIcon icon={icon} {...props} />
}

export type { SafeIconProps }
