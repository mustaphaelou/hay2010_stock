import { Metadata } from 'next'
import * as React from "react"

import { ArticlesView } from "@/components/erp/articles-view"

import { getArticlesWithStock } from "@/app/actions/articles"
import { loadPageData } from '@/lib/page-data-loader'

/* eslint-disable react-refresh/only-export-components */
export const metadata: Metadata = {
  title: 'Articles | HAY2010',
  description: 'Gestion des articles et produits'
}

export const dynamic = 'force-dynamic'

export default async function ArticlesPage() {
  const { data: articlesWithStock } = await loadPageData(
    () => getArticlesWithStock()
  )

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0 pb-20 md:gap-8 md:p-8 md:pb-8">
      <ArticlesView data={articlesWithStock} />
    </div>
  )
}
