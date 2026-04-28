"use client"

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
import { SafeIcon as HugeiconsIcon } from "@/components/ui/safe-icon"
import { MailSend02Icon, Loading02Icon, CheckmarkCircle02Icon, ArrowLeft02Icon } from "@hugeicons/core-free-icons"
import { requestPasswordReset } from "@/app/actions/password-reset"

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await requestPasswordReset(email)

      if (result.error) {
        setError(result.error)
        setLoading(false)
      } else {
        setSuccess(true)
      }
    } catch (err) {
      console.error('Password reset request error:', err)
      setError('Une erreur inattendue est survenue')
      setLoading(false)
    }
  }

  if (success) {
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
        <div className="size-16 rounded-full bg-green-500/10 flex items-center justify-center mt-4">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-10 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold">Vérifiez votre Email</h1>
        <p className="text-sm text-balance text-muted-foreground max-w-xs">
          Si un compte existe pour <span className="font-medium text-foreground">{email}</span>, vous recevrez un lien de réinitialisation sous peu.
        </p>
        <p className="text-xs text-muted-foreground mt-4">
          {/* Development mode: Check server console for reset link */}
          <strong>Mode Dev :</strong> Vérifiez la console du serveur pour le lien de réinitialisation.
        </p>
        <Link 
          href="/login"
          className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <HugeiconsIcon icon={ArrowLeft02Icon} className="size-4" />
          Retour à la connexion
        </Link>
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
          <h1 className="text-2xl font-bold">Mot de passe oublié ?</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
          </p>
        </div>

        {error && (
          <div id="form-error" role="alert" aria-live="polite" className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        <Field>
          <FieldLabel htmlFor="email">Adresse Email</FieldLabel>
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
          <Button type="submit" className="w-full" disabled={loading || !email}>
            {loading ? (
              <>
                <HugeiconsIcon icon={Loading02Icon} className="mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <HugeiconsIcon icon={MailSend02Icon} className="mr-2" />
                Envoyer le lien
              </>
            )}
          </Button>
        </Field>

        <FieldDescription className="text-center">
          <Link 
            href="/login" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
          >
            <HugeiconsIcon icon={ArrowLeft02Icon} className="size-4" />
            Retour à la connexion
          </Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  )
}
