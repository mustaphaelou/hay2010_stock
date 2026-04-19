/* eslint-disable react-refresh/only-export-components */
'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react'

interface CsrfContextType {
  csrfToken: string | null
  isLoading: boolean
  error: string | null
  refreshToken: () => Promise<void>
}

const CsrfContext = createContext<CsrfContextType>({
  csrfToken: null,
  isLoading: true,
  error: null,
  refreshToken: async () => {},
})

/** Maximum number of retry attempts for token fetch failures */
const MAX_FETCH_RETRIES = 3
/** Base delay between retries (ms), doubles each attempt */
const RETRY_BASE_DELAY = 1000

export function CsrfProvider({ children }: { children: ReactNode }) {
  const [csrfToken, setCsrfToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const retryCountRef = useRef(0)
  const isFetchingRef = useRef(false)

  const fetchToken = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) return
    isFetchingRef.current = true

    try {
      const response = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token (status: ${response.status})`)
      }

      const data = await response.json()
      setCsrfToken(data.token)
      setError(null)
      retryCountRef.current = 0
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('CSRF token fetch error:', errorMessage)
      setError(errorMessage)

      // Exponential backoff retry
      if (retryCountRef.current < MAX_FETCH_RETRIES) {
        retryCountRef.current++
        const delay = RETRY_BASE_DELAY * Math.pow(2, retryCountRef.current - 1)
        setTimeout(() => {
          isFetchingRef.current = false
          fetchToken()
        }, delay)
        return
      }
    } finally {
      setIsLoading(false)
      isFetchingRef.current = false
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchToken()
  }, [fetchToken])

  // Refresh token when the window regains focus (tab switch)
  // This ensures the token is fresh after the user was away
  useEffect(() => {
    const handleFocus = () => {
      retryCountRef.current = 0
      fetchToken()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchToken])

  // Refresh token periodically (every 50 minutes, well before the 1-hour expiry)
  useEffect(() => {
    const interval = setInterval(() => {
      retryCountRef.current = 0
      fetchToken()
    }, 50 * 60 * 1000)

    return () => clearInterval(interval)
  }, [fetchToken])

  return (
    <CsrfContext.Provider value={{ csrfToken, isLoading, error, refreshToken: fetchToken }}>
      {children}
    </CsrfContext.Provider>
  )
}

export function useCsrf(): CsrfContextType {
  const context = useContext(CsrfContext)
  if (!context) {
    throw new Error('useCsrf must be used within a CsrfProvider')
  }
  return context
}
