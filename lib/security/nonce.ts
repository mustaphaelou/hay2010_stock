import { headers } from 'next/headers'
import { randomBytes } from 'crypto'

export async function getNonce(): Promise<string> {
  const headersList = await headers()
  const existingNonce = headersList.get('x-nonce')

  if (existingNonce) {
    return existingNonce
  }

  const nonce = randomBytes(16).toString('base64')
  return nonce
}
