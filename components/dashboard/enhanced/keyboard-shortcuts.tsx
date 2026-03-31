/* eslint-disable react-refresh/only-export-components */
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SafeIcon as HugeiconsIcon } from "@/components/ui/safe-icon"
import { KeyboardIcon } from "@hugeicons/core-free-icons"

interface ShortcutConfig {
  id: string
  keys: string[]
  description: string
  action: () => void
  category?: string
}

interface KeyboardShortcutsProps {
  shortcuts?: ShortcutConfig[]
  children?: React.ReactNode
  className?: string
}

const defaultShortcuts: ShortcutConfig[] = [
  {
    id: "command-palette",
    keys: ["⌘", "K"],
    description: "Open command palette",
    action: () => {},
    category: "General",
  },
  {
    id: "toggle-sidebar",
    keys: ["⌘", "B"],
    description: "Toggle sidebar",
    action: () => {},
    category: "Navigation",
  },
  {
    id: "refresh",
    keys: ["⌘", "R"],
    description: "Refresh data",
    action: () => {},
    category: "Actions",
  },
  {
    id: "search",
    keys: ["⌘", "/"],
    description: "Focus search",
    action: () => {},
    category: "Navigation",
  },
  {
    id: "new-item",
    keys: ["⌘", "N"],
    description: "Create new item",
    action: () => {},
    category: "Actions",
  },
  {
    id: "save",
    keys: ["⌘", "S"],
    description: "Save changes",
    action: () => {},
    category: "Actions",
  },
  {
    id: "export",
    keys: ["⌘", "E"],
    description: "Export data",
    action: () => {},
    category: "Actions",
  },
  {
    id: "help",
    keys: ["?"],
    description: "Show keyboard shortcuts",
    action: () => {},
    category: "General",
  },
  {
    id: "close",
    keys: ["Esc"],
    description: "Close dialog/modal",
    action: () => {},
    category: "Navigation",
  },
  {
    id: "fullscreen",
    keys: ["F11"],
    description: "Toggle fullscreen",
    action: () => {},
    category: "View",
  },
]

const ShortcutDisplay = React.memo(function ShortcutDisplay({
  keys,
  size = "default",
}: {
  keys: string[]
  size?: "sm" | "default" | "lg"
}) {
  const sizeClasses = {
    sm: "h-5 min-w-5 px-1.5 text-[10px]",
    default: "h-6 min-w-6 px-2 text-xs",
    lg: "h-7 min-w-7 px-2.5 text-sm",
  }

  return (
    <div className="flex items-center gap-1">
      {keys.map((key, index) => (
        <React.Fragment key={index}>
          <kbd
            className={cn(
              "inline-flex items-center justify-center rounded border bg-muted font-mono font-medium shadow-sm",
              sizeClasses[size]
            )}
          >
            {key}
          </kbd>
          {index < keys.length - 1 && (
            <span className="text-muted-foreground text-xs">+</span>
          )}
        </React.Fragment>
      ))}
    </div>
  )
})

const KeyboardShortcutsContext = React.createContext<{
  shortcuts: ShortcutConfig[]
  registerShortcut: (shortcut: ShortcutConfig) => void
  unregisterShortcut: (id: string) => void
  showHelp: () => void
} | null>(null)

export function useKeyboardShortcuts() {
  const context = React.useContext(KeyboardShortcutsContext)
  if (!context) {
    throw new Error("useKeyboardShortcuts must be used within KeyboardShortcutsProvider")
  }
  return context
}

export function KeyboardShortcutsProvider({
  shortcuts: initialShortcuts = defaultShortcuts,
  children,
}: {
  shortcuts?: ShortcutConfig[]
  children: React.ReactNode
}) {
  const [shortcuts, setShortcuts] = React.useState<ShortcutConfig[]>(initialShortcuts)
  const [showHelpDialog, setShowHelpDialog] = React.useState(false)

  const registerShortcut = React.useCallback((shortcut: ShortcutConfig) => {
    setShortcuts((prev) => {
      const exists = prev.find((s) => s.id === shortcut.id)
      if (exists) return prev
      return [...prev, shortcut]
    })
  }, [])

  const unregisterShortcut = React.useCallback((id: string) => {
    setShortcuts((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const showHelp = React.useCallback(() => {
    setShowHelpDialog(true)
  }, [])

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0
      const cmdKey = isMac ? event.metaKey : event.ctrlKey

      for (const shortcut of shortcuts) {
        const keys = shortcut.keys.map((k) => k.toLowerCase())
        const mainKey = keys[keys.length - 1]
        const needsCmd = keys.includes("⌘") || keys.includes("ctrl")

        let matches = false

        if (needsCmd) {
          if (mainKey === "k" && cmdKey && event.key.toLowerCase() === "k") matches = true
          if (mainKey === "b" && cmdKey && event.key.toLowerCase() === "b") matches = true
          if (mainKey === "r" && cmdKey && event.key.toLowerCase() === "r") matches = true
          if (mainKey === "/" && cmdKey && event.key === "/") matches = true
          if (mainKey === "n" && cmdKey && event.key.toLowerCase() === "n") matches = true
          if (mainKey === "s" && cmdKey && event.key.toLowerCase() === "s") matches = true
          if (mainKey === "e" && cmdKey && event.key.toLowerCase() === "e") matches = true
        } else {
          if (mainKey === "?" && event.key === "?") matches = true
          if (mainKey === "esc" && event.key === "Escape") matches = true
          if (mainKey === "f11" && event.key === "F11") matches = true
        }

        if (matches) {
          if (shortcut.id === "help") {
            setShowHelpDialog((prev) => !prev)
          } else {
            event.preventDefault()
            shortcut.action()
          }
          break
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [shortcuts])

  const groupedShortcuts = React.useMemo(() => {
    const groups: Record<string, ShortcutConfig[]> = {}
    for (const shortcut of shortcuts) {
      const category = shortcut.category || "Other"
      if (!groups[category]) groups[category] = []
      groups[category].push(shortcut)
    }
    return groups
  }, [shortcuts])

  return (
    <KeyboardShortcutsContext.Provider
      value={{ shortcuts, registerShortcut, unregisterShortcut, showHelp }}
    >
      {children}
      <KeyboardShortcutsHelpDialog
        open={showHelpDialog}
        onOpenChange={setShowHelpDialog}
        groupedShortcuts={groupedShortcuts}
      />
    </KeyboardShortcutsContext.Provider>
  )
}

function KeyboardShortcutsHelpDialog({
  open,
  onOpenChange,
  groupedShortcuts,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupedShortcuts: Record<string, ShortcutConfig[]>
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={KeyboardIcon} strokeWidth={2} className="size-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate and perform actions quickly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category} className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {category}
              </h4>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut) => (
                  <div
                    key={shortcut.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <ShortcutDisplay keys={shortcut.keys} size="sm" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Press <kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px] font-mono">?</kbd> anytime to show this dialog
          </p>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function KeyboardShortcuts({
  shortcuts = defaultShortcuts,
  children,
}: KeyboardShortcutsProps) {
  const [showHelp, setShowHelp] = React.useState(false)

  const groupedShortcuts = React.useMemo(() => {
    const groups: Record<string, ShortcutConfig[]> = {}
    for (const shortcut of shortcuts) {
      const category = shortcut.category || "Other"
      if (!groups[category]) groups[category] = []
      groups[category].push(shortcut)
    }
    return groups
  }, [shortcuts])

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0
      const cmdKey = isMac ? event.metaKey : event.ctrlKey

      for (const shortcut of shortcuts) {
        const keys = shortcut.keys.map((k) => k.toLowerCase())
        const mainKey = keys[keys.length - 1]
        const needsCmd = keys.includes("⌘") || keys.includes("ctrl")

        let matches = false

        if (needsCmd) {
          if (mainKey === "k" && cmdKey && event.key.toLowerCase() === "k") matches = true
          if (mainKey === "b" && cmdKey && event.key.toLowerCase() === "b") matches = true
          if (mainKey === "r" && cmdKey && event.key.toLowerCase() === "r") matches = true
          if (mainKey === "/" && cmdKey && event.key === "/") matches = true
          if (mainKey === "n" && cmdKey && event.key.toLowerCase() === "n") matches = true
          if (mainKey === "s" && cmdKey && event.key.toLowerCase() === "s") matches = true
          if (mainKey === "e" && cmdKey && event.key.toLowerCase() === "e") matches = true
        } else {
          if (mainKey === "?" && event.key === "?") {
            setShowHelp((prev) => !prev)
            return
          }
          if (mainKey === "esc" && event.key === "Escape") matches = true
          if (mainKey === "f11" && event.key === "F11") matches = true
        }

        if (matches) {
          event.preventDefault()
          shortcut.action()
          break
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [shortcuts])

  return (
    <>
      {children}
      <KeyboardShortcutsHelpDialog
        open={showHelp}
        onOpenChange={setShowHelp}
        groupedShortcuts={groupedShortcuts}
      />
    </>
  )
}

export function KeyboardShortcutsButton({
  className,
  variant = "ghost",
}: {
  className?: string
  variant?: "ghost" | "outline" | "default"
}) {
  const [showHelp, setShowHelp] = React.useState(false)

  const groupedShortcuts = React.useMemo(() => {
    const groups: Record<string, ShortcutConfig[]> = {}
    for (const shortcut of defaultShortcuts) {
      const category = shortcut.category || "Other"
      if (!groups[category]) groups[category] = []
      groups[category].push(shortcut)
    }
    return groups
  }, [])

  return (
    <>
      <Button
        variant={variant}
        size="icon"
        onClick={() => setShowHelp(true)}
        className={cn("size-9", className)}
        aria-label="Show keyboard shortcuts"
      >
        <HugeiconsIcon icon={KeyboardIcon} strokeWidth={2} className="size-4" />
      </Button>
      <KeyboardShortcutsHelpDialog
        open={showHelp}
        onOpenChange={setShowHelp}
        groupedShortcuts={groupedShortcuts}
      />
    </>
  )
}

export type { ShortcutConfig, KeyboardShortcutsProps }
