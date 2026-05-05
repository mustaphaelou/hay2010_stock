import { listApiKeys } from '@/app/actions/api-keys'
import ApiKeysClient from './ApiKeysClient'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'API Keys | Admin | HAY2010 Stock',
  description: 'Manage API keys for system integrations',
}

export default async function ApiKeysPage() {
  const keys = await listApiKeys()
  
  return <ApiKeysClient keys={keys} />
}
