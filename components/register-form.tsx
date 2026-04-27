"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
import { UserAdd01Icon, ViewIcon, ViewOffIcon, Loading02Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons"
import { SafeIcon } from "@/components/ui/safe-icon"
import { publicRegister } from "../app/actions/registration"
import { getCsrfToken } from "@/lib/security/csrf-client"

/** Maximum number of automatic retries after CSRF token failure */
const CSRF_MAX_RETRIES = 1

export function RegisterForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
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

  // Fetch CSRF token on mount
  useEffect(() => {
    refreshToken()
  }, [refreshToken])

  const passwordRequirements = [
    { label: 'Au moins 8 caractères', valid: password.length >= 8 },
    { label: 'Une lettre majuscule', valid: /[A-Z]/.test(password) },
    { label: 'Une lettre minuscule', valid: /[a-z]/.test(password) },
    { label: 'Un chiffre', valid: /[0-9]/.test(password) },
  ]

  const allRequirementsMet = passwordRequirements.every(r => r.valid)
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0

  function isCsrfError(errorMessage: string): boolean {
    return errorMessage.toLowerCase().includes('jeton') ||
           errorMessage.toLowerCase().includes('csrf') ||
           errorMessage.toLowerCase().includes('security token')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!allRequirementsMet) {
      setError('Veuillez respecter toutes les exigences du mot de passe')
      setLoading(false)
      return
    }

    if (!passwordsMatch) {
      setError('Les mots de passe ne correspondent pas')
      setLoading(false)
      return
    }

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

      const result = await publicRegister(email, password, name, currentToken || undefined)

      if (result.error) {
        // If CSRF error, attempt automatic retry with a fresh token
        if (isCsrfError(result.error) && csrfRetryCount < CSRF_MAX_RETRIES) {
          setCsrfRetryCount(prev => prev + 1)
          const freshToken = await refreshToken()

          if (freshToken) {
            const retryResult = await publicRegister(email, password, name, freshToken)

            if (retryResult.error) {
              setError(retryResult.error)
              setLoading(false)
              refreshToken()
            } else {
              setSuccess(true)
              setTimeout(() => {
                router.push('/login?registered=true')
              }, 2000)
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
        setSuccess(true)
        setTimeout(() => {
          router.push('/login?registered=true')
        }, 2000)
      }
    } catch (err) {
      console.error('Registration submit error:', err)
      setError('Une erreur inattendue est survenue')
      setLoading(false)
      refreshToken()
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 text-center py-8">
        <div className="size-16 rounded-full bg-green-500/10 flex items-center justify-center">
          <SafeIcon icon={CheckmarkCircle02Icon} className="size-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold">Compte créé !</h2>
        <p className="text-muted-foreground">
          Votre compte a été créé avec succès. Redirection vers la connexion...
        </p>
      </div>
    )
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
          <h1 className="text-2xl font-bold">Créer un compte</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Entrez vos informations pour créer un nouveau compte
          </p>
        </div>

        {error && (
          <div id="form-error" role="alert" aria-live="polite" className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        <Field>
          <FieldLabel htmlFor="name">Nom complet</FieldLabel>
          <Input
            id="name"
            type="text"
            placeholder="Jean Dupont"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading}
            aria-required="true"
            aria-invalid={!!error}
            autoComplete="name"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            aria-required="true"
            aria-invalid={!!error}
            autoComplete="email"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
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
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              disabled={loading}
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              <SafeIcon icon={showPassword ? ViewOffIcon : ViewIcon} className="size-5" />
            </button>
          </div>
          <div className="mt-2 space-y-1">
            {passwordRequirements.map((req, i) => (
              <div key={i} className={`flex items-center gap-2 text-xs ${req.valid ? 'text-green-600' : 'text-muted-foreground'}`}>
                <span className={`size-4 rounded-full flex items-center justify-center ${req.valid ? 'bg-green-500/10' : 'bg-muted'}`}>
                  {req.valid && <span className="text-[10px]">✓</span>}
                </span>
                {req.label}
              </div>
            ))}
          </div>
        </Field>

        <Field>
          <FieldLabel htmlFor="confirmPassword">Confirmer le mot de passe</FieldLabel>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              className={`pr-10 ${confirmPassword && !passwordsMatch ? 'border-destructive' : ''}`}
              aria-required="true"
              aria-invalid={!!error || (confirmPassword.length > 0 && !passwordsMatch)}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              disabled={loading}
              aria-label={showConfirmPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              <SafeIcon icon={showConfirmPassword ? ViewOffIcon : ViewIcon} className="size-5" />
            </button>
          </div>
          {confirmPassword && !passwordsMatch && (
            <p className="text-xs text-destructive mt-1">Les mots de passe ne correspondent pas</p>
          )}
        </Field>

        <Field>
          <Button
            type="submit"
            className="w-full"
            disabled={loading || !allRequirementsMet || !passwordsMatch}
          >
            {loading ? (
              <>
                <SafeIcon icon={Loading02Icon} className="mr-2 animate-spin" />
                Création du compte...
              </>
            ) : (
              <>
                <SafeIcon icon={UserAdd01Icon} className="mr-2" />
                Créer un compte
              </>
            )}
          </Button>
        </Field>

        <FieldDescription className="text-center">
          Déjà un compte ?{' '}
          <Link href="/login" className="underline underline-offset-4 hover:text-primary">
            Se connecter
          </Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  )
}
