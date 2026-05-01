'use client'

import { useState } from 'react'
import { createApiKey, revokeApiKey } from '@/app/actions/api-keys'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'

type ApiKeyWithUser = {
  id: string
  name: string
  keyPrefix: string
  isActive: boolean
  createdAt: Date
  user?: {
    name: string
    email: string
  } | null
}

type ApiKeyListClientProps = {
  keys: ApiKeyWithUser[]
}

export default function ApiKeysClient({ keys }: ApiKeyListClientProps) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [newKey, setNewKey] = useState<{ rawKey: string, name: string } | null>(null)
  const router = useRouter()

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name) return
    setLoading(true)
    try {
      const result = await createApiKey(name)
      setNewKey({ rawKey: result.rawKey, name: result.name })
      setName('')
      router.refresh()
    } catch (error) {
      console.error(error)
      alert('Failed to create API key')
    } finally {
      setLoading(false)
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm('Are you sure you want to revoke this API key?')) return
    try {
      await revokeApiKey(id)
      router.refresh()
    } catch (error) {
      console.error(error)
      alert('Failed to revoke API key')
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-6">
      <h1 className="text-3xl font-bold">API Keys Management</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Create New API Key</CardTitle>
          <CardDescription>Generate a new API key for programmatic access. Make sure to copy the key as it won't be shown again.</CardDescription>
        </CardHeader>
        <CardContent>
          {newKey ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md mb-4">
              <h3 className="text-green-800 font-semibold mb-2">API Key Created: {newKey.name}</h3>
              <p className="text-sm text-green-700 mb-2">Please copy this key and store it securely. You won't be able to see it again!</p>
              <code className="block p-3 bg-white rounded border text-sm font-mono break-all">
                {newKey.rawKey}
              </code>
              <Button className="mt-4" onClick={() => setNewKey(null)}>Dismiss</Button>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="flex gap-4 items-end">
              <div className="flex-1">
                <label htmlFor="name" className="block text-sm font-medium mb-1">Key Name</label>
                <Input 
                  type="text" 
                  id="name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required 
                  placeholder="e.g. ERP Integration Backend" 
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? 'Generating...' : 'Generate Key'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active API Keys</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Prefix</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell className="font-mono">{key.keyPrefix}...</TableCell>
                    <TableCell>
                      {key.isActive ? (
                        <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
                      ) : (
                        <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-100">Revoked</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{key.user?.name}</div>
                      <div className="text-xs text-muted-foreground">{key.user?.email}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(key.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {key.isActive && (
                        <Button variant="destructive" size="sm" onClick={() => handleRevoke(key.id)}>
                          Revoke
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {keys.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No API keys found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
