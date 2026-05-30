'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface VariantConfig {
  key: string
  name: string
}

interface PrototypeSwitcherProps {
  variants: VariantConfig[]
  current: string
}

export default function PrototypeSwitcher({ variants, current }: PrototypeSwitcherProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Only render in development
  if (process.env.NODE_ENV === 'production') {
    return null
  }

  const currentIndex = variants.findIndex(v => v.key === current)
  const currentVariant = variants[currentIndex] || variants[0]

  const setVariant = (key: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('variant', key)
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  const handlePrev = () => {
    const prevIndex = (currentIndex - 1 + variants.length) % variants.length
    setVariant(variants[prevIndex].key)
  }

  const handleNext = () => {
    const nextIndex = (currentIndex + 1) % variants.length
    setVariant(variants[nextIndex].key)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept arrow keys when inputting text
      const target = e.target as HTMLElement
      if (
        !target ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      if (e.key === 'ArrowLeft') {
        handlePrev()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, variants])

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 bg-slate-900/95 text-slate-100 px-4 py-2.5 rounded-full shadow-2xl border border-slate-700/50 backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-slate-950">
      <button
        onClick={handlePrev}
        className="p-1 rounded-full hover:bg-slate-800 active:bg-slate-700 transition-colors cursor-pointer text-slate-400 hover:text-slate-100"
        aria-label="Variant précédente"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <span className="text-xs font-bold tracking-wider select-none min-w-[200px] text-center uppercase text-violet-400">
        PROTOTYPE : {currentVariant.key} — {currentVariant.name}
      </span>

      <button
        onClick={handleNext}
        className="p-1 rounded-full hover:bg-slate-800 active:bg-slate-700 transition-colors cursor-pointer text-slate-400 hover:text-slate-100"
        aria-label="Variant suivante"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}
