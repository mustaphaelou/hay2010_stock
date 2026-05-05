'use server'

import { executeWrite } from '@/lib/actions/execute-write'
import { updateUserProfile, getUserProfile as getUserProfileSvc } from '@/lib/auth/profile-service'
import { requireAuth } from '@/lib/auth/user-utils'
import { updateProfileSchema } from '@/lib/auth/validation'

export async function updateProfile(fd: FormData): Promise<{ error?: string; success?: boolean }> {
  const name = fd.get('name') as string
  const email = fd.get('email') as string
  const currentPassword = (fd.get('currentPassword') as string) || undefined
  const csrfToken = (fd.get('csrfToken') as string) || ''

  return executeWrite({
    permission: 'authenticated', csrfToken,
    validation: { schema: updateProfileSchema, input: { name, email, currentPassword } },
    writeFn: async (user) => {
      const r = await updateUserProfile(user.id, name, email, currentPassword)
      if (r.error) return { error: r.error }
      return { success: true }
    },
  })
}

export async function getUserProfile() {
  const user = await requireAuth()
  return (await getUserProfileSvc(user.id)).data ?? null
}
