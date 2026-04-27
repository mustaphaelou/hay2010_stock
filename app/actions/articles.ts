'use server'

import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { requirePermission } from '@/lib/auth/authorization'
import { validateActionCsrf } from '@/lib/utils/action-helpers'
import { getArticlesWithStock as getArticles, toggleArticleStatus as toggleStatus } from '@/lib/stock/stock-service'
import { CacheInvalidationService } from '@/lib/cache/invalidation'

export async function getArticlesWithStock(page: number = 1, limit: number = 50) {
  await requirePermission('stock:read')
  return getArticles(page, limit)
}

export async function toggleArticleStatus(
  id_produit: number,
  newStatus: boolean,
  csrfToken: string
): Promise<{ success?: boolean; error?: string }> {
  const user = await requirePermission('stock:write')

  const csrfError = await validateActionCsrf(user.id, csrfToken)
  if (csrfError) return { error: csrfError }

  const result = await toggleStatus(id_produit, newStatus)
  if (result.success) {
    after(async () => {
      await CacheInvalidationService.invalidateProduct(id_produit)
      revalidatePath('/articles')
    })
  }
  return result
}
