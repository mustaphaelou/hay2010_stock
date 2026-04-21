'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { updateProfile } from '@/app/actions/profile'
import { getCsrfToken } from '@/lib/security/csrf-client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Spinner } from '@/components/ui/spinner'
import { SafeIcon as HugeiconsIcon } from '@/components/ui/safe-icon'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar'
import {
  UserEdit01Icon,
  LockPasswordIcon,
  Notification01Icon,
  Tick02Icon,
  Shield01Icon,
  Calendar01Icon,
  Logout01Icon,
} from '@hugeicons/core-free-icons'

interface UserProfile {
  id: string
  email: string
  name: string
  role: string
  createdAt: Date | null
  lastLoginAt: Date | null
}

interface SettingsClientProps {
  profile: UserProfile
}

export function SettingsClient({ profile }: SettingsClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()
  const [name, setName] = React.useState(profile.name)
  const [email, setEmail] = React.useState(profile.email)
  const [emailNotifications, setEmailNotifications] = React.useState(true)
  const [loginAlerts, setLoginAlerts] = React.useState(true)
  const [monthlyReports, setMonthlyReports] = React.useState(false)

  const initials = profile.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const roleLabel: Record<string, string> = {
    ADMIN: 'Administrateur',
    MANAGER: 'Gestionnaire',
    USER: 'Utilisateur',
    VIEWER: 'Observateur',
  }

  const formatDate = (date: Date | null) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    startTransition(async () => {
      const csrfToken = await getCsrfToken()
      if (!csrfToken) {
        toast.error('Erreur de sécurité. Veuillez actualiser la page.')
        return
      }

      const formData = new FormData()
      formData.set('name', name)
      formData.set('email', email)
      formData.set('csrfToken', csrfToken)

      const result = await updateProfile(formData)

      if (result.error) {
        toast.error(result.error)
      }
      if (result.success) {
        toast.success('Profil mis à jour avec succès')
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground text-sm">
          Gérez les paramètres de votre compte et vos préférences.
        </p>
      </div>

      <Tabs defaultValue="profile" orientation="horizontal">
        <TabsList>
          <TabsTrigger value="profile">
            <HugeiconsIcon icon={UserEdit01Icon} strokeWidth={2} data-icon="inline-start" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="security">
            <HugeiconsIcon icon={LockPasswordIcon} strokeWidth={2} data-icon="inline-start" />
            Sécurité
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <HugeiconsIcon icon={Notification01Icon} strokeWidth={2} data-icon="inline-start" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="flex flex-col gap-6 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Informations du profil</CardTitle>
                <CardDescription>
                  Mettez à jour vos informations personnelles et votre adresse email.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form id="profile-form" onSubmit={handleSubmit}>
                  <FieldGroup>
                    <FieldSet>
                      <FieldLegend>Photo de profil</FieldLegend>
                      <FieldDescription>
                        Votre avatar est généré à partir de vos initiales.
                      </FieldDescription>
                      <div className="flex items-center gap-4 mt-2">
                        <Avatar className="size-16" style={{ '--avatar-size': '4rem' } as React.CSSProperties}>
                          <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col gap-1">
                          <p className="text-sm font-medium">{profile.name}</p>
                          <p className="text-muted-foreground text-xs">{roleLabel[profile.role] || profile.role}</p>
                        </div>
                      </div>
                    </FieldSet>

                    <FieldSeparator />

                    <FieldSet>
                      <FieldLegend>Coordonnées</FieldLegend>
                      <FieldGroup>
                        <Field>
                          <FieldLabel htmlFor="profile-name">Nom complet</FieldLabel>
                          <Input
                            id="profile-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Votre nom complet"
                            required
                          />
                          <FieldDescription>
                            Ce nom sera affiché dans l&apos;application et sur vos documents.
                          </FieldDescription>
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="profile-email">Adresse email</FieldLabel>
                          <Input
                            id="profile-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="votre@email.com"
                            required
                          />
                          <FieldDescription>
                            Utilisée pour la connexion et les notifications.
                          </FieldDescription>
                        </Field>
                      </FieldGroup>
                    </FieldSet>

                    <FieldSeparator />

                    <FieldSet>
                      <FieldLegend>Informations du compte</FieldLegend>
                      <FieldDescription>
                        Détails de votre compte — ces informations ne peuvent pas être modifiées ici.
                      </FieldDescription>
                      <FieldGroup>
                        <Field orientation="horizontal">
                          <FieldLabel>
                            <div className="flex items-center gap-2">
                              <HugeiconsIcon icon={Shield01Icon} strokeWidth={2} className="text-muted-foreground" />
                              <span>Rôle</span>
                            </div>
                          </FieldLabel>
                          <span className="text-sm">{roleLabel[profile.role] || profile.role}</span>
                        </Field>
                        <Field orientation="horizontal">
                          <FieldLabel>
                            <div className="flex items-center gap-2">
                              <HugeiconsIcon icon={Calendar01Icon} strokeWidth={2} className="text-muted-foreground" />
                              <span>Compte créé le</span>
                            </div>
                          </FieldLabel>
                          <span className="text-sm">{formatDate(profile.createdAt)}</span>
                        </Field>
                        <Field orientation="horizontal">
                          <FieldLabel>
                            <div className="flex items-center gap-2">
                              <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} className="text-muted-foreground" />
                              <span>Dernière connexion</span>
                            </div>
                          </FieldLabel>
                          <span className="text-sm">{formatDate(profile.lastLoginAt)}</span>
                        </Field>
                      </FieldGroup>
                    </FieldSet>
                  </FieldGroup>
                </form>
              </CardContent>
              <CardFooter>
                <div className="flex items-center gap-2">
                  <Button type="submit" form="profile-form" disabled={isPending}>
                    {isPending ? (
                      <Spinner data-icon="inline-start" />
                    ) : (
                      <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} data-icon="inline-start" />
                    )}
                    Enregistrer les modifications
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setName(profile.name)
                      setEmail(profile.email)
                    }}
                  >
                    Annuler
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security">
          <div className="flex flex-col gap-6 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Mot de passe</CardTitle>
                <CardDescription>
                  Modifiez votre mot de passe pour sécuriser votre compte.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="current-password">Mot de passe actuel</FieldLabel>
                    <Input id="current-password" type="password" placeholder="••••••••" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="new-password">Nouveau mot de passe</FieldLabel>
                    <Input id="new-password" type="password" placeholder="••••••••" />
                    <FieldDescription>
                      Minimum 8 caractères, avec au moins une majuscule, une minuscule et un chiffre.
                    </FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="confirm-password">Confirmer le mot de passe</FieldLabel>
                    <Input id="confirm-password" type="password" placeholder="••••••••" />
                  </Field>
                </FieldGroup>
              </CardContent>
              <CardFooter>
                <Button>
                  <HugeiconsIcon icon={LockPasswordIcon} strokeWidth={2} data-icon="inline-start" />
                  Mettre à jour le mot de passe
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sessions actives</CardTitle>
                <CardDescription>
                  Gérez vos appareils et sessions connectés.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">Session actuelle</p>
                      <span className="bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full">
                        Actif
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      Dernière activité : {formatDate(profile.lastLoginAt)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <div className="flex flex-col gap-6 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Préférences de notification</CardTitle>
                <CardDescription>
                  Choisissez comment et quand vous souhaitez être notifié.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <FieldSet>
                    <FieldLegend>Par email</FieldLegend>
                    <FieldDescription>
                      Recevez des notifications par email pour les événements importants.
                    </FieldDescription>
                    <FieldGroup>
                      <Field orientation="horizontal">
                        <div className="flex flex-col gap-0.5">
                          <FieldLabel htmlFor="email-notifications">Notifications par email</FieldLabel>
                          <FieldDescription>
                            Recevez des alertes pour les nouvelles ventes, achats et documents.
                          </FieldDescription>
                        </div>
                        <Switch
                          id="email-notifications"
                          checked={emailNotifications}
                          onCheckedChange={setEmailNotifications}
                        />
                      </Field>
                      <Field orientation="horizontal">
                        <div className="flex flex-col gap-0.5">
                          <FieldLabel htmlFor="login-alerts">Alertes de connexion</FieldLabel>
                          <FieldDescription>
                            Soyez averti lorsqu&apos;une nouvelle connexion est détectée sur votre compte.
                          </FieldDescription>
                        </div>
                        <Switch
                          id="login-alerts"
                          checked={loginAlerts}
                          onCheckedChange={setLoginAlerts}
                        />
                      </Field>
                      <Field orientation="horizontal">
                        <div className="flex flex-col gap-0.5">
                          <FieldLabel htmlFor="monthly-reports">Rapports mensuels</FieldLabel>
                          <FieldDescription>
                            Recevez un résumé mensuel de votre activité commerciale par email.
                          </FieldDescription>
                        </div>
                        <Switch
                          id="monthly-reports"
                          checked={monthlyReports}
                          onCheckedChange={setMonthlyReports}
                        />
                      </Field>
                    </FieldGroup>
                  </FieldSet>
                </FieldGroup>
              </CardContent>
              <CardFooter>
                <Button>
                  <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} data-icon="inline-start" />
                  Enregistrer les préférences
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
