'use server'

import { serverActionWrite } from '@/lib/actions/server-action-write'
import { updateUserProfile, getUserProfile as getUserProfileSvc } from '@/lib/auth/profile-service'
import { requireAuth } from '@/lib/auth/user-utils'
import { updateProfileSchema } from '@/lib/auth/validation'

export async function updateProfile(fd: FormData) {
  const name = fd.get('name') as string
  const email = fd.get('email') as string
  const currentPassword = (fd.get('currentPassword') as string) || undefined
  const csrfToken = (fd.get('csrfToken') as string) || ''

  return serverActionWrite('authenticated', csrfToken, async (user) => updateUserProfile(user.id, name, email, currentPassword), {
    validation: { schema: updateProfileSchema, input: { name, email, currentPassword } },
  })
}

export async function getUserProfile() {
  const user = await requireAuth()
  return (await getUserProfileSvc(user.id)).data ?? null
}
