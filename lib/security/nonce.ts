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

export function createCSP(nonce: string, isDev: boolean = false): string {
  const directives = {
    'default-src': ["'self'"],
    'script-src': isDev 
      ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
      : ["'self'", `'nonce-${nonce}'`],
    'style-src': isDev
      ? ["'self'", "'unsafe-inline'"]
      : ["'self'", `'nonce-${nonce}'`],
    'img-src': ["'self'", 'data:', 'https:', 'blob:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': isDev 
      ? ["'self'", 'https:', 'ws:', 'wss:']
      : ["'self'", 'https:'],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'object-src': ["'none'"],
  }

  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ')
}
