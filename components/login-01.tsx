"use client"

import { useState } from 'react'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
import { HugeiconsIcon } from "@hugeicons/react"
import { Login01Icon, ViewIcon, ViewOffIcon, Loading02Icon } from "@hugeicons/core-free-icons"
import { login } from "@/app/actions/auth"

export function Login01() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await login(email, password)

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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/20 via-transparent to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-violet-500/10 via-transparent to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Glass card */}
      <div className="w-full max-w-md relative z-10">
        <div className="card-premium p-8 sm:p-10 animate-scale-in">
          {/* Logo section */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              <div className="size-20 rounded-2xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-lg shadow-primary/25">
                <Image
                  src="/hay2010-logo.png"
                  alt="HAY2010"
                  width={48}
                  height={48}
                  className="object-contain"
                />
              </div>
<div className="absolute -bottom-1 -right-1 size-6 bg-emerald-500 rounded-full border-2 border-background flex items-center justify-center">
								<div className="size-2 bg-white rounded-full" />
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight gradient-text">HAY2010</h1>
            <p className="text-sm text-muted-foreground mt-1">Gestion Commerciale</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-fade-in-up">
              {error}
            </div>
          )}

          {/* Login form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <FieldGroup>
              <Field>
            <FieldLabel htmlFor="email">
              Adresse Email <span className="text-red-500">*</span>
            </FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@hay2010.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="h-12 input-focus-ring"
                />
              </Field>

              <Field>
            <FieldLabel htmlFor="password">
              Mot de passe <span className="text-red-500">*</span>
            </FieldLabel>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12 input-focus-ring pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={loading}
                  >
                    <HugeiconsIcon
                      icon={showPassword ? ViewOffIcon : ViewIcon}
                      className="text-muted-foreground"
                    />
                  </button>
                </div>
                <FieldDescription>
                  Votre mot de passe est sécurisé et chiffré
                </FieldDescription>
              </Field>
            </FieldGroup>

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold hover-lift"
              disabled={loading}
            >
              {loading ? (
                <>
                  <HugeiconsIcon
                    icon={Loading02Icon}
                    className="mr-2 animate-spin"
                  />
                  Connexion en cours...
                </>
              ) : (
                <>
                  <HugeiconsIcon
                    icon={Login01Icon}
                    data-icon="inline-start"
                  />
                  Se connecter
                </>
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} HAY2010. Tous droits réservés.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
