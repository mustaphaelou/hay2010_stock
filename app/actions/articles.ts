'use server'

import { requirePermission } from '@/lib/auth/authorization'
import { getArticlesWithStock as getArticles, toggleArticleStatus as toggleStatus } from '@/lib/stock/stock-service'
import { executeWrite } from '@/lib/actions/execute-write'

export async function getArticlesWithStock(page: number = 1, limit: number = 50) {
  await requirePermission('stock:read')
  return getArticles(page, limit)
}

export async function toggleArticleStatus(
  id_produit: number,
  newStatus: boolean,
  csrfToken: string
) {
  return executeWrite({
    permission: 'stock:write',
    csrfToken,
    writeFn: () => toggleStatus(id_produit, newStatus),
    invalidations: [{ kind: 'product', productId: id_produit }],
    revalidatePaths: ['/articles'],
  })
}
