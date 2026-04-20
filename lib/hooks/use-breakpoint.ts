"use client"

import { useMediaQuery } from "./use-media-query"

type Breakpoint = "sm" | "md" | "lg" | "xl" | "2xl"

const breakpoints: Record<Breakpoint, string> = {
  sm: "(min-width: 640px)",
  md: "(min-width: 768px)",
  lg: "(min-width: 1024px)",
  xl: "(min-width: 1280px)",
  "2xl": "(min-width: 1536px)",
}

export function useBreakpoint(): Breakpoint | "xs" {
  const sm = useMediaQuery(breakpoints.sm)
  const md = useMediaQuery(breakpoints.md)
  const lg = useMediaQuery(breakpoints.lg)
  const xl = useMediaQuery(breakpoints.xl)
  const xxl = useMediaQuery(breakpoints["2xl"])

  if (xxl) return "2xl"
  if (xl) return "xl"
  if (lg) return "lg"
  if (md) return "md"
  if (sm) return "sm"
  return "xs"
}

export function useIsMobile(): boolean {
  return !useMediaQuery(breakpoints.md)
}

export function useIsDesktop(): boolean {
  return useMediaQuery(breakpoints.lg)
}
