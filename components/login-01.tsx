"use client"

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@/components/ui/input-otp"

export function Login01() {
    const [email, setEmail] = useState('')
    const [otpSent, setOtpSent] = useState(false)
    const [otp, setOtp] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)

    const supabase = createClient()

    // Allowed email domain
    const ALLOWED_DOMAIN = 'hay2010.ma'

    const validateEmailDomain = (email: string): boolean => {
        const domain = email.split('@')[1]?.toLowerCase()
        return domain === ALLOWED_DOMAIN
    }

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setMessage(null)

        // Validate email domain
        if (!validateEmailDomain(email)) {
            setError(`Seuls les emails @${ALLOWED_DOMAIN} sont autorisés.`)
            setLoading(false)
            return
        }

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                shouldCreateUser: true,
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        })

        if (error) {
            setError(error.message)
        } else {
            setOtpSent(true)
            setMessage('Un lien de connexion a été envoyé à votre email. Cliquez sur le lien pour vous connecter.')
        }
        setLoading(false)
    }

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const { error } = await supabase.auth.verifyOtp({
            email,
            token: otp,
            type: 'email',
        })

        if (error) {
            setError(error.message)
        } else {
            // Redirect happens automatically via middleware
            window.location.href = '/'
        }
        setLoading(false)
    }

    return (
        <Card className="mx-auto w-full max-w-lg">
            <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                        <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                    </svg>
                </div>
                <CardTitle className="text-2xl font-bold">HAY2010 Stock</CardTitle>
                <CardDescription>
                    {otpSent
                        ? 'Vérifiez votre boîte email et cliquez sur le lien'
                        : 'Connectez-vous avec votre email @hay2010.ma'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {!otpSent ? (
                    <form onSubmit={handleSendOTP} className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email" className="text-base">Adresse Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="nom@hay2010.ma"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={loading}
                                className="h-12 text-lg"
                            />
                        </div>

                        {error && (
                            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/50 p-3 rounded-lg">
                                {error}
                            </div>
                        )}

                        <Button type="submit" className="w-full h-12 text-lg" disabled={loading}>
                            {loading ? 'Envoi en cours...' : 'Recevoir le lien de connexion'}
                        </Button>
                    </form>
                ) : (
                    <div className="grid gap-4">
                        <div className="flex flex-col items-center justify-center py-6 gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-green-600">
                                    <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
                                    <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
                                </svg>
                            </div>
                            <p className="text-center text-muted-foreground">
                                Un lien de connexion a été envoyé à<br />
                                <strong className="text-foreground">{email}</strong>
                            </p>
                        </div>

                        {message && (
                            <div className="text-sm text-green-600 bg-green-50 dark:bg-green-950/50 p-3 rounded-lg text-center">
                                {message}
                            </div>
                        )}

                        {error && (
                            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/50 p-3 rounded-lg">
                                {error}
                            </div>
                        )}

                        <Button
                            type="button"
                            variant="outline"
                            className="w-full h-12"
                            onClick={() => {
                                setOtpSent(false)
                                setOtp('')
                                setError(null)
                                setMessage(null)
                            }}
                        >
                            Utiliser un autre email
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
