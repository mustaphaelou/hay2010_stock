"use client"

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldGroup, FieldLabel, FieldDescription, FieldSeparator } from "@/components/ui/field"
import { HugeiconsIcon } from "@hugeicons/react"
import { Login01Icon, ViewIcon, ViewOffIcon, Loading02Icon, GoogleIcon, GithubIcon } from "@hugeicons/core-free-icons"
import { login } from "@/app/actions/auth"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await login(email, password, rememberMe)

      if (result.error) {
        setError(result.error)
        setLoading(false)
      } else {
        window.location.href = '/'
      }
    } catch (err) {
      console.error('Login submit error:', err)
      setError('An unexpected error occurred')
      setLoading(false)
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
                className="object-contain"
              />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Connexion</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Entrez vos identifiants pour accéder à votre compte
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
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
          />
        </Field>

        <Field>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
            <Link
              href="#"
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
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              disabled={loading}
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
            />
            <label
              htmlFor="remember"
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

        <FieldSeparator>Ou continuer avec</FieldSeparator>

        <Field>
          <div className="flex gap-3">
            <Button variant="outline" type="button" className="flex-1">
              <HugeiconsIcon icon={GoogleIcon} className="mr-2" />
              Google
            </Button>
            <Button variant="outline" type="button" className="flex-1">
              <HugeiconsIcon icon={GithubIcon} className="mr-2" />
              GitHub
            </Button>
          </div>
          <FieldDescription className="text-center mt-4">
            Pas encore de compte ?{' '}
            <Link href="/register" className="underline underline-offset-4 hover:text-primary">
              Créer un compte
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}