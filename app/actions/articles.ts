'use server'

import { requirePermission } from '@/lib/auth/authorization'
import { getArticlesWithStock as getArticles, toggleArticleStatus as toggleStatus } from '@/lib/produits/produit-service'
import { serverActionWrite } from '@/lib/actions/server-action-write'

export async function getArticlesWithStock(page: number = 1, limit: number = 50) {
  await requirePermission('stock:read')
  return getArticles(page, limit)
}

export async function toggleArticleStatus(
  id_produit: number,
  newStatus: boolean,
  csrfToken: string
) {
  return serverActionWrite('stock:write', csrfToken, () => toggleStatus(id_produit, newStatus), {
    invalidations: [{ kind: 'product', productId: id_produit }],
    revalidatePaths: ['/articles'],
  })
}
