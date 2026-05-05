export function randomBytesHex(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}
