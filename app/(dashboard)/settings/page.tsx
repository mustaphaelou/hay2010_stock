import { getUserProfile } from '@/app/actions/profile'
import { SettingsClient } from './settings-client'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Paramètres',
}

export default async function SettingsPage() {
  const profile = await getUserProfile()

  if (!profile) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground text-sm">Impossible de charger les informations du profil.</p>
      </div>
    )
  }

  return <SettingsClient profile={profile} />
}
