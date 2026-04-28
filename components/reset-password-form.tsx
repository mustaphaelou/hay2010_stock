"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { SafeIcon as HugeiconsIcon } from "@/components/ui/safe-icon"
import { Key02Icon, ViewIcon, ViewOffIcon, Loading02Icon, CheckmarkCircle02Icon, ArrowLeft02Icon } from "@hugeicons/core-free-icons"
import { resetPassword, validateResetTokenAction } from "@/app/actions/password-reset"

export function ResetPasswordForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [token, setToken] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(true)
  const [tokenError, setTokenError] = useState<string | null>(null)
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    if (!tokenParam) {
      setTokenError('Aucun jeton fourni. Veuillez demander un nouveau lien de réinitialisation.')
      setIsValidating(false)
      return
    }
    setToken(tokenParam)
    
    // Validate token
    validateResetTokenAction(tokenParam).then((result: { valid: boolean; email?: string; error?: string }) => {
        setIsValidating(false)
        if (result.valid) {
        } else {
            setTokenError(result.error || 'Jeton de réinitialisation invalide')
        }
    })
  }, [searchParams])

  const passwordRequirements = [
    { label: 'Au moins 8 caractères', valid: password.length >= 8 },
    { label: 'Une lettre majuscule', valid: /[A-Z]/.test(password) },
    { label: 'Une lettre minuscule', valid: /[a-z]/.test(password) },
    { label: 'Un chiffre', valid: /[0-9]/.test(password) },
  ]

  const allRequirementsMet = passwordRequirements.every(r => r.valid)
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    
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
      const result = await resetPassword(token, password)

      if (result.error) {
        setError(result.error)
        setLoading(false)
      } else {
        setSuccess(true)
        setTimeout(() => {
          router.push('/login?reset=true')
        }, 2000)
      }
    } catch (err) {
      console.error('Password reset error:', err)
      setError('Une erreur inattendue est survenue')
      setLoading(false)
    }
  }

  if (isValidating) {
    return (
      <div className="flex flex-col items-center gap-4 text-center py-8">
        <HugeiconsIcon icon={Loading02Icon} className="size-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Validation du jeton de réinitialisation...</p>
      </div>
    )
  }

  if (tokenError) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
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
        <h1 className="text-2xl font-bold">Lien invalide</h1>
        <p className="text-sm text-balance text-muted-foreground max-w-xs">
          {tokenError}
        </p>
        <Link 
          href="/forgot-password"
          className="mt-4"
        >
          <Button variant="outline">
            Demander un nouveau lien
          </Button>
        </Link>
        <Link 
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mt-2"
        >
          <HugeiconsIcon icon={ArrowLeft02Icon} className="size-4" />
          Retour à la connexion
        </Link>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 text-center py-8">
        <div className="size-16 rounded-full bg-green-500/10 flex items-center justify-center">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold">Mot de passe réinitialisé !</h2>
        <p className="text-muted-foreground">
          Votre mot de passe a été réinitialisé avec succès. Redirection vers la connexion...
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
          <h1 className="text-2xl font-bold">Réinitialiser le mot de passe</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Entrez votre nouveau mot de passe ci-dessous
          </p>
        </div>

        {error && (
          <div id="form-error" role="alert" aria-live="polite" className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        <Field>
          <FieldLabel htmlFor="password">Nouveau mot de passe</FieldLabel>
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
              <HugeiconsIcon icon={showPassword ? ViewOffIcon : ViewIcon} className="size-5" />
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
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              <HugeiconsIcon icon={showConfirmPassword ? ViewOffIcon : ViewIcon} className="size-5" />
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
                <HugeiconsIcon icon={Loading02Icon} className="mr-2 animate-spin" />
                Réinitialisation en cours...
              </>
            ) : (
              <>
                <HugeiconsIcon icon={Key02Icon} className="mr-2" />
Réinitialiser
                </>
              )}
            </Button>
          </Field>
      </FieldGroup>
    </form>
  )
}
