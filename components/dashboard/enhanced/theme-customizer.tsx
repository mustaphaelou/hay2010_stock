"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { SafeIcon as HugeiconsIcon } from "@/components/ui/safe-icon"
import {
  PaintBrush01Icon,
  Sun01Icon,
  Moon02Icon,
  CheckmarkCircle02Icon,
  ReloadIcon,
} from "@hugeicons/core-free-icons"

interface ThemePreset {
  id: string
  name: string
  primary: string
  accent: string
  background: string
  foreground: string
  darkPrimary?: string
  darkAccent?: string
  darkBackground?: string
  darkForeground?: string
  radius: number
}

const themePresets: ThemePreset[] = [
  {
    id: "default",
    name: "Par défaut",
    primary: "hsl(222.2 47.4% 11.2%)",
    accent: "hsl(210 40% 96.1%)",
    background: "hsl(0 0% 100%)",
    foreground: "hsl(222.2 47.4% 11.2%)",
    darkPrimary: "hsl(210 40% 98%)",
    darkAccent: "hsl(217.2 32.6% 17.5%)",
    darkBackground: "hsl(222.2 47.4% 11.2%)",
    darkForeground: "hsl(210 40% 98%)",
    radius: 8,
  },
  {
    id: "emerald",
    name: "Émeraude",
    primary: "hsl(160 84% 39%)",
    accent: "hsl(160 84% 95%)",
    background: "hsl(0 0% 100%)",
    foreground: "hsl(160 84% 10%)",
    darkPrimary: "hsl(160 84% 60%)",
    darkAccent: "hsl(160 84% 15%)",
    darkBackground: "hsl(160 20% 6%)",
    darkForeground: "hsl(160 84% 90%)",
    radius: 12,
  },
  {
    id: "violet",
    name: "Violet",
    primary: "hsl(262 83% 58%)",
    accent: "hsl(262 83% 95%)",
    background: "hsl(0 0% 100%)",
    foreground: "hsl(262 83% 10%)",
    darkPrimary: "hsl(262 83% 70%)",
    darkAccent: "hsl(262 83% 15%)",
    darkBackground: "hsl(262 20% 6%)",
    darkForeground: "hsl(262 83% 90%)",
    radius: 8,
  },
  {
    id: "rose",
    name: "Rose",
    primary: "hsl(346 77% 50%)",
    accent: "hsl(346 77% 95%)",
    background: "hsl(0 0% 100%)",
    foreground: "hsl(346 77% 10%)",
    darkPrimary: "hsl(346 77% 65%)",
    darkAccent: "hsl(346 77% 15%)",
    darkBackground: "hsl(346 20% 6%)",
    darkForeground: "hsl(346 77% 90%)",
    radius: 6,
  },
  {
    id: "amber",
    name: "Ambre",
    primary: "hsl(38 92% 50%)",
    accent: "hsl(38 92% 95%)",
    background: "hsl(0 0% 100%)",
    foreground: "hsl(38 92% 10%)",
    darkPrimary: "hsl(38 92% 65%)",
    darkAccent: "hsl(38 92% 15%)",
    darkBackground: "hsl(38 20% 6%)",
    darkForeground: "hsl(38 92% 90%)",
    radius: 10,
  },
  {
    id: "cyan",
    name: "Cyan",
    primary: "hsl(189 94% 43%)",
    accent: "hsl(189 94% 95%)",
    background: "hsl(0 0% 100%)",
    foreground: "hsl(189 94% 10%)",
    darkPrimary: "hsl(189 94% 60%)",
    darkAccent: "hsl(189 94% 15%)",
    darkBackground: "hsl(189 20% 6%)",
    darkForeground: "hsl(189 94% 90%)",
    radius: 8,
  },
]

interface ThemeCustomizerProps {
  onThemeChange?: (theme: ThemePreset & { mode: "light" | "dark" }) => void
  trigger?: React.ReactNode
}

function hslToHex(hsl: string): string {
  const match = hsl.match(/hsl\((\d+\.?\d*)\s+(\d+\.?\d*)%\s+(\d+\.?\d*)%\)/)
  if (!match) return "#000000"

  const h = parseFloat(match[1]) / 360
  const s = parseFloat(match[2]) / 100
  const l = parseFloat(match[3]) / 100

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1/6) return p + (q - p) * 6 * t
    if (t < 1/2) return q
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
    return p
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const r = Math.round(hue2rgb(p, q, h + 1/3) * 255)
  const g = Math.round(hue2rgb(p, q, h) * 255)
  const b = Math.round(hue2rgb(p, q, h - 1/3) * 255)

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
}

function hexToHsl(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return "hsl(0 0% 0%)"

  const r = parseInt(result[1], 16) / 255
  const g = parseInt(result[2], 16) / 255
  const b = parseInt(result[3], 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return `hsl(${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`
}

function ColorPicker({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (value: string) => void
  label: string
}) {
  const hexValue = hslToHex(value)

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={hexValue}
          onChange={(e) => onChange(hexToHsl(e.target.value))}
          className="size-10 rounded-lg border cursor-pointer"
          aria-label={`Couleur ${label}`}
        />
        <code className="text-xs text-muted-foreground font-mono">{value}</code>
      </div>
    </div>
  )
}

function ThemePreview({ theme, mode }: { theme: ThemePreset; mode: "light" | "dark" }) {
  const bgStyle = mode === "dark"
    ? { background: theme.darkBackground || "hsl(222.2 47.4% 11.2%)" }
    : { background: theme.background }

  const textStyle = mode === "dark"
    ? { color: theme.darkForeground || "hsl(210 40% 98%)" }
    : { color: theme.foreground }

  const primaryStyle = mode === "dark"
    ? { background: theme.darkPrimary || theme.primary }
    : { background: theme.primary }

  const accentStyle = mode === "dark"
    ? { background: theme.darkAccent || theme.accent }
    : { background: theme.accent }

  return (
    <div
      className={cn(
        "rounded-lg p-4 border transition-all duration-300",
        "hover:shadow-lg hover:scale-[1.02] cursor-pointer"
      )}
      style={bgStyle}
    >
      <div className="space-y-3">
        <div className="h-3 w-3/4 rounded" style={primaryStyle} />
        <div className="h-2 w-1/2 rounded" style={accentStyle} />
        <div className="flex gap-2 mt-3">
          <div className="h-6 w-16 rounded-md" style={primaryStyle} />
          <div className="h-6 w-16 rounded-md border" style={{ borderColor: theme.primary, ...textStyle }} />
        </div>
      </div>
    </div>
  )
}

function applyThemeToCSS(theme: ThemePreset & { mode: "light" | "dark" }) {
  const root = document.documentElement
  if (theme.mode === "dark") {
    root.style.setProperty("--primary", theme.darkPrimary || theme.primary)
    root.style.setProperty("--accent", theme.darkAccent || theme.accent)
    root.style.setProperty("--background", theme.darkBackground || theme.background)
    root.style.setProperty("--foreground", theme.darkForeground || theme.foreground)
  } else {
    root.style.setProperty("--primary", theme.primary)
    root.style.setProperty("--accent", theme.accent)
    root.style.setProperty("--background", theme.background)
    root.style.setProperty("--foreground", theme.foreground)
  }
  root.style.setProperty("--radius", `${theme.radius}px`)
  localStorage.setItem("dashboard-theme", JSON.stringify(theme))
}

function loadPersistedTheme(): (ThemePreset & { mode: "light" | "dark" }) | null {
  try {
    const stored = localStorage.getItem("dashboard-theme")
    if (stored) return JSON.parse(stored)
  } catch {}
  return null
}

export function ThemeCustomizer({
  onThemeChange,
  trigger,
}: ThemeCustomizerProps) {
  const [selectedPreset, setSelectedPreset] = React.useState<string>("default")
  const [mode, setMode] = React.useState<"light" | "dark">("light")
  const [customPrimary, setCustomPrimary] = React.useState(themePresets[0].primary)
  const [customAccent, setCustomAccent] = React.useState(themePresets[0].accent)
  const [radius, setRadius] = React.useState(8)
  const [isOpen, setIsOpen] = React.useState(false)
  const [hasChanges, setHasChanges] = React.useState(false)

  React.useEffect(() => {
    const persisted = loadPersistedTheme()
    if (persisted) {
      setSelectedPreset(persisted.id)
      setMode(persisted.mode)
      setRadius(persisted.radius)
      if (persisted.mode === "dark") {
        setCustomPrimary(persisted.darkPrimary || persisted.primary)
        setCustomAccent(persisted.darkAccent || persisted.accent)
      } else {
        setCustomPrimary(persisted.primary)
        setCustomAccent(persisted.accent)
      }
      applyThemeToCSS(persisted)
    }
  }, [])

  const currentPreset = themePresets.find((p) => p.id === selectedPreset) || themePresets[0]

  const currentTheme = React.useMemo(() => ({
    ...currentPreset,
    primary: hasChanges ? customPrimary : currentPreset.primary,
    accent: hasChanges ? customAccent : currentPreset.accent,
    radius,
  }), [currentPreset, customPrimary, customAccent, radius, hasChanges])

  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId)
    const preset = themePresets.find((p) => p.id === presetId)
    if (preset) {
      if (mode === "dark") {
        setCustomPrimary(preset.darkPrimary || preset.primary)
        setCustomAccent(preset.darkAccent || preset.accent)
      } else {
        setCustomPrimary(preset.primary)
        setCustomAccent(preset.accent)
      }
      setRadius(preset.radius)
      setHasChanges(false)
    }
  }

  const handleApply = () => {
    const themeToApply = { ...currentTheme, mode }
    onThemeChange?.(themeToApply)
    applyThemeToCSS(themeToApply)
    setIsOpen(false)
  }

  const handleReset = () => {
    const preset = themePresets.find((p) => p.id === selectedPreset)
    if (preset) {
      if (mode === "dark") {
        setCustomPrimary(preset.darkPrimary || preset.primary)
        setCustomAccent(preset.darkAccent || preset.accent)
      } else {
        setCustomPrimary(preset.primary)
        setCustomAccent(preset.accent)
      }
      setRadius(preset.radius)
      setHasChanges(false)
    }
  }

  React.useEffect(() => {
    const preset = themePresets.find((p) => p.id === selectedPreset)
    if (preset) {
      const presetPrimary = mode === "dark" ? (preset.darkPrimary || preset.primary) : preset.primary
      const presetAccent = mode === "dark" ? (preset.darkAccent || preset.accent) : preset.accent
      const hasPrimaryChange = customPrimary !== presetPrimary
      const hasAccentChange = customAccent !== presetAccent
      const hasRadiusChange = radius !== preset.radius
      setHasChanges(hasPrimaryChange || hasAccentChange || hasRadiusChange)
    }
  }, [customPrimary, customAccent, radius, selectedPreset, mode])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <HugeiconsIcon icon={PaintBrush01Icon} strokeWidth={2} className="size-4" />
            Personnaliser le thème
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={PaintBrush01Icon} strokeWidth={2} className="size-5" />
            Personnalisation du thème
          </DialogTitle>
          <DialogDescription>
            Personnalisez l'apparence de votre tableau de bord. Les modifications sont appliquées instantanément.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="space-y-4">
            <Label className="text-base font-semibold">Thèmes prédéfinis</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {themePresets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetChange(preset.id)}
                  className={cn(
                    "relative rounded-lg border-2 p-3 transition-all text-left",
                    selectedPreset === preset.id
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50"
                  )}
                  aria-label={`Sélectionner le thème ${preset.name}`}
                >
                  {selectedPreset === preset.id && (
                    <div className="absolute top-2 right-2">
                      <HugeiconsIcon
                        icon={CheckmarkCircle02Icon}
                        strokeWidth={2}
                        className="size-4 text-primary"
                      />
                    </div>
                  )}
                  <div className="font-medium text-sm">{preset.name}</div>
                  <div className="flex gap-1 mt-2">
                    <div className="size-4 rounded-full border" style={{ background: preset.primary }} />
                    <div className="size-4 rounded-full border" style={{ background: preset.accent }} />
                    {preset.darkPrimary && (
                      <div className="size-4 rounded-full border" style={{ background: preset.darkPrimary }} />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="space-y-1">
              <Label className="font-medium">Mode sombre</Label>
              <p className="text-sm text-muted-foreground">
                Basculer entre l'apparence claire et sombre
              </p>
            </div>
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                icon={Sun01Icon}
                strokeWidth={2}
                className={cn("size-5", mode === "light" ? "text-primary" : "text-muted-foreground")}
              />
              <Switch
                checked={mode === "dark"}
                onCheckedChange={(checked) => setMode(checked ? "dark" : "light")}
                aria-label="Basculer le mode sombre"
              />
              <HugeiconsIcon
                icon={Moon02Icon}
                strokeWidth={2}
                className={cn("size-5", mode === "dark" ? "text-primary" : "text-muted-foreground")}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <ColorPicker
              value={customPrimary}
              onChange={setCustomPrimary}
              label="Couleur principale"
            />
            <ColorPicker
              value={customAccent}
              onChange={setCustomAccent}
              label="Couleur d'accentuation"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="font-medium">Rayon de bordure</Label>
              <span className="text-sm text-muted-foreground">{radius}px</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {[0, 4, 8, 12, 16, 24].map((r) => (
                <Button
                  key={r}
                  variant={radius === r ? "default" : "outline"}
                  size="xs"
                  onClick={() => setRadius(r)}
                  aria-label={`Définir le rayon à ${r}px`}
                >
                  {r}px
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="font-medium">Aperçu en direct</Label>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Clair</span>
                <ThemePreview theme={currentTheme} mode="light" />
              </div>
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Sombre</span>
                <ThemePreview theme={currentTheme} mode="dark" />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges}
            className="gap-2"
          >
            <HugeiconsIcon icon={ReloadIcon} strokeWidth={2} className="size-4" />
            Réinitialiser
          </Button>
          <Button onClick={handleApply} className="gap-2">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4" />
            Appliquer le thème
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export type { ThemeCustomizerProps, ThemePreset }
