export async function validateActionCsrf(userId: string, csrfToken: string): Promise<string | null> {
  try {
    const { requireCsrfToken, getCsrfCookie } = await import('@/lib/security/csrf-server')
    const csrfCookie = await getCsrfCookie()
    await requireCsrfToken(userId, csrfToken, csrfCookie || '')
    return null
  } catch {
    return 'Invalid security token. Please refresh the page and try again.'
  }
}
