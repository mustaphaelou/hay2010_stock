"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
import { SafeIcon as HugeiconsIcon } from "@/components/ui/safe-icon"
import { Login01Icon, ViewIcon, ViewOffIcon, Loading02Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons"
import { login } from "../app/actions/auth"
import { getCsrfToken } from "@/lib/security/csrf-client"

/** Maximum number of automatic retries after CSRF token failure */
const CSRF_MAX_RETRIES = 1

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [csrfToken, setCsrfToken] = useState<string | null>(null)
  const [csrfRetryCount, setCsrfRetryCount] = useState(0)

  const refreshToken = useCallback(async (): Promise<string | null> => {
    try {
      const token = await getCsrfToken()
      setCsrfToken(token)
      return token
    } catch (err) {
      console.error('CSRF token refresh error:', err)
      return null
    }
  }, [])

  useEffect(() => {
    refreshToken()
  }, [refreshToken])

  const successMessage = searchParams.get('registered')
    ? 'Compte créé avec succès ! Veuillez vous connecter.'
    : searchParams.get('reset')
    ? 'Mot de passe réinitialisé avec succès ! Veuillez vous connecter.'
    : null

  /**
   * Check if an error message indicates a CSRF token failure.
   * These errors are retryable with a fresh token.
   */
  function isCsrfError(errorMessage: string): boolean {
    return errorMessage.toLowerCase().includes('security token') ||
           errorMessage.toLowerCase().includes('csrf')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Ensure we have a CSRF token before submitting
      let currentToken = csrfToken
      if (!currentToken) {
        currentToken = await refreshToken()
        if (!currentToken) {
          setError('Impossible de générer un jeton de sécurité. Veuillez actualiser la page.')
          setLoading(false)
          return
        }
      }

      const result = await login(email, password, rememberMe, currentToken || undefined)

      if (result.error) {
        // If CSRF error, attempt automatic retry with a fresh token
        if (isCsrfError(result.error) && csrfRetryCount < CSRF_MAX_RETRIES) {
          setCsrfRetryCount(prev => prev + 1)
          const freshToken = await refreshToken()

          if (freshToken) {
            const retryResult = await login(email, password, rememberMe, freshToken)

            if (retryResult.error) {
              setError(retryResult.error)
              setLoading(false)
              // Refresh token again for next attempt
              refreshToken()
            } else {
              const redirectTo = searchParams.get('redirect') || '/'
              const safeRedirect = redirectTo.startsWith('/login') || redirectTo.match(/\.(png|jpg|svg|ico|css|js|map|json)$/)
                ? '/'
                : redirectTo
              router.push(safeRedirect)
              router.refresh()
            }
            return
          }
        }

        setError(result.error)
        setLoading(false)
        // Refresh CSRF token after any error for the next attempt
        setCsrfRetryCount(0)
        refreshToken()
      } else {
        const redirectTo = searchParams.get('redirect') || '/'
        const safeRedirect = redirectTo.startsWith('/login') || redirectTo.match(/\.(png|jpg|svg|ico|css|js|map|json)$/)
          ? '/'
          : redirectTo
        router.push(safeRedirect)
        router.refresh()
      }
    } catch (err) {
      console.error('Login submit error:', err)
      setError('Une erreur inattendue est survenue')
      setLoading(false)
      refreshToken()
    }
  }

  return (
    <form onSubmit={handleSubmit} className={className} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <div className="relative mb-2">
            <div className="size-14 rounded-xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-lg shadow-primary/25">
              <Image
                src="/hay2010-logo.png"
                alt="HAY2010"
                width={32}
                height={32}
                priority
                className="object-contain"
              />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Connexion</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Entrez vos identifiants pour accéder à votre compte
          </p>
        </div>

        {successMessage && (
          <div id="form-success" role="alert" aria-live="polite" className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-700 text-sm flex items-center gap-2">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-5" />
            {successMessage}
          </div>
        )}

        {error && (
          <div id="form-error" role="alert" aria-live="polite" className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="admin@hay2010.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            aria-required="true"
            aria-invalid={!!error}
            aria-describedby={error ? "form-error" : undefined}
            autoComplete="email"
          />
        </Field>

        <Field>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
            <Link
              href="/forgot-password"
              className="text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
            >
              Mot de passe oublié ?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="pr-10"
              aria-required="true"
              aria-invalid={!!error}
              aria-describedby={error ? "form-error" : undefined}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              disabled={loading}
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              <HugeiconsIcon icon={showPassword ? ViewOffIcon : ViewIcon} className="size-5" />
            </button>
          </div>
        </Field>

        <Field>
          <div className="flex items-center gap-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              disabled={loading}
              aria-describedby="remember-label"
            />
            <label
              htmlFor="remember"
              id="remember-label"
              className="text-sm text-muted-foreground cursor-pointer peer-disabled:opacity-50"
            >
              Se souvenir de moi
            </label>
          </div>
        </Field>

        <Field>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <HugeiconsIcon icon={Loading02Icon} className="mr-2 animate-spin" />
                Connexion en cours...
              </>
            ) : (
              <>
                <HugeiconsIcon icon={Login01Icon} className="mr-2" />
                Se connecter
              </>
            )}
          </Button>
        </Field>

        <FieldDescription className="text-center mt-4">
          Pas encore de compte ?{' '}
          <Link href="/register" className="underline underline-offset-4 hover:text-primary">
            Créer un compte
          </Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  )
}
