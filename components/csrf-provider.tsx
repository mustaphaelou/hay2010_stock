/* eslint-disable react-refresh/only-export-components */
'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'

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

export function CsrfProvider({ children }: { children: ReactNode }) {
  const [csrfToken, setCsrfToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchToken = useCallback(async () => {
    try {
      const response = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch CSRF token')
      }

      const data = await response.json()
      setCsrfToken(data.token)
      setError(null)
    } catch (err) {
      console.error('CSRF token fetch error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchToken()
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


