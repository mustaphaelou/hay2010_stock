"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { HugeiconsIcon } from "@hugeicons/react"
import { Key02Icon, ViewIcon, ViewOffIcon, Loading02Icon, CheckmarkCircle02Icon, ArrowLeft02Icon } from "@hugeicons/core-free-icons"
import { resetPassword, validateResetToken } from "@/app/actions/password-reset"

export function ResetPasswordForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [token, setToken] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
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
      setTokenError('No reset token provided. Please request a new password reset link.')
      setIsValidating(false)
      return
    }
    setToken(tokenParam)
    
    // Validate token
    validateResetToken(tokenParam).then(result => {
      setIsValidating(false)
      if (result.valid) {
        setTokenValid(true)
      } else {
        setTokenError(result.error || 'Invalid reset token')
      }
    })
  }, [searchParams])

  const passwordRequirements = [
    { label: 'At least 8 characters', valid: password.length >= 8 },
    { label: 'One uppercase letter', valid: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', valid: /[a-z]/.test(password) },
    { label: 'One number', valid: /[0-9]/.test(password) },
  ]

  const allRequirementsMet = passwordRequirements.every(r => r.valid)
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    
    setLoading(true)
    setError(null)

    if (!allRequirementsMet) {
      setError('Please meet all password requirements')
      setLoading(false)
      return
    }

    if (!passwordsMatch) {
      setError('Passwords do not match')
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
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  if (isValidating) {
    return (
      <div className="flex flex-col items-center gap-4 text-center py-8">
        <HugeiconsIcon icon={Loading02Icon} className="size-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Validating reset token...</p>
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
        <h1 className="text-2xl font-bold">Invalid Link</h1>
        <p className="text-sm text-balance text-muted-foreground max-w-xs">
          {tokenError}
        </p>
        <Link 
          href="/forgot-password"
          className="mt-4"
        >
          <Button variant="outline">
            Request New Reset Link
          </Button>
        </Link>
        <Link 
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mt-2"
        >
          <HugeiconsIcon icon={ArrowLeft02Icon} className="size-4" />
          Back to Login
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
        <h2 className="text-2xl font-bold">Password Reset!</h2>
        <p className="text-muted-foreground">
          Your password has been reset successfully. Redirecting to login...
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
          <h1 className="text-2xl font-bold">Reset Password</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Enter your new password below
          </p>
        </div>

        {error && (
          <div id="form-error" role="alert" aria-live="polite" className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        <Field>
          <FieldLabel htmlFor="password">New Password</FieldLabel>
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
              aria-label={showPassword ? "Hide password" : "Show password"}
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
          <FieldLabel htmlFor="confirmPassword">Confirm New Password</FieldLabel>
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
            <p className="text-xs text-destructive mt-1">Passwords do not match</p>
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
                Resetting password...
              </>
            ) : (
              <>
                <HugeiconsIcon icon={Key02Icon} className="mr-2" />
                Reset Password
              </>
            )}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}
