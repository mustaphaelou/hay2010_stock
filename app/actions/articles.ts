'use server'

import { requirePermission } from '@/lib/auth/authorization'
import { getArticlesWithStock as getArticles, toggleArticleStatus as toggleStatus } from '@/lib/stock/stock-service'
import { executeStockWrite } from '@/lib/stock/stock-write'

export async function getArticlesWithStock(page: number = 1, limit: number = 50) {
await requirePermission('stock:read')
return getArticles(page, limit)
}

export async function toggleArticleStatus(
id_produit: number,
newStatus: boolean,
csrfToken: string
): Promise<{ success?: boolean; error?: string }> {
return executeStockWrite({
csrfToken,
writeFn: () => toggleStatus(id_produit, newStatus),
invalidations: [{ kind: 'product', productId: id_produit }],
revalidatePaths: ['/articles'],
})
}
