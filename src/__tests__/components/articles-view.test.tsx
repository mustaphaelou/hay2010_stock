import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ArticlesView } from '@/components/erp/articles-view'
import type { ArticleWithStock } from '@/lib/types'

vi.mock('@/components/erp/article-details-sheet', () => ({
  ArticleDetailsSheet: () => null,
}))

vi.mock('@/lib/hooks/use-breakpoint', () => ({
  useIsMobile: vi.fn().mockReturnValue(false),
}))

function createMockArticle(overrides: Partial<ArticleWithStock> = {}): ArticleWithStock {
  return {
    id_produit: 1,
    code_produit: 'ART001',
    nom_produit: 'Test Article',
    famille: 'Electronics',
    id_categorie: null,
    description_produit: null,
    code_barre_ean: null,
    unite_mesure: 'PCS',
    poids_kg: null,
    volume_m3: null,
    prix_achat: null,
    prix_dernier_achat: null,
    coefficient: null,
    prix_vente: null,
    prix_gros: null,
    taux_tva: null,
    type_suivi_stock: null,
    quantite_min_commande: null,
    niveau_reappro_quantite: null,
    stock_minimum: 5,
    stock_maximum: null,
    activer_suivi_stock: true,
    id_fournisseur_principal: null,
    reference_fournisseur: null,
    delai_livraison_fournisseur_jours: null,
    est_actif: true,
    en_sommeil: false,
    est_abandonne: false,
    date_creation: new Date(),
    date_modification: new Date(),
    cree_par: null,
    modifie_par: null,
    compte_general_vente: null,
    compte_general_achat: null,
    code_taxe_vente: null,
    code_taxe_achat: null,
    categorie: null,
    niveaux_stock: [],
    stock_global: 10,
    ...overrides,
  } as ArticleWithStock
}

describe('ArticlesView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render articles list', () => {
    const articles = [
      createMockArticle({ id_produit: 1, code_produit: 'ART001', nom_produit: 'Article Alpha' }),
      createMockArticle({ id_produit: 2, code_produit: 'ART002', nom_produit: 'Article Beta' }),
    ]

    render(<ArticlesView data={articles} />)

    expect(screen.getByText('Article Alpha')).toBeInTheDocument()
    expect(screen.getByText('Article Beta')).toBeInTheDocument()
    expect(screen.getByText('ART001')).toBeInTheDocument()
    expect(screen.getByText('ART002')).toBeInTheDocument()
  })

  it('should filter articles by search query', async () => {
    const user = userEvent.setup()
    const articles = [
      createMockArticle({ id_produit: 1, nom_produit: 'Laptop Pro', code_produit: 'LP001' }),
      createMockArticle({ id_produit: 2, nom_produit: 'Mouse Wireless', code_produit: 'MW001' }),
    ]

    render(<ArticlesView data={articles} />)

    const searchInput = screen.getByLabelText(/rechercher un article/i)
    await user.type(searchInput, 'Laptop')

    await waitFor(() => {
      expect(screen.getByText('Laptop Pro')).toBeInTheDocument()
      expect(screen.queryByText('Mouse Wireless')).not.toBeInTheDocument()
    })
  })

  it('should filter articles by family', async () => {
    const user = userEvent.setup()
    const articles = [
      createMockArticle({ id_produit: 1, nom_produit: 'Laptop', famille: 'Electronics' }),
      createMockArticle({ id_produit: 2, nom_produit: 'Desk', famille: 'Furniture' }),
    ]

    render(<ArticlesView data={articles} />)

    const familyTrigger = screen.getByLabelText(/filtrer par famille/i)
    await user.click(familyTrigger)

    const electronicsOption = await screen.findByRole('option', { name: 'Electronics' })
    await user.click(electronicsOption)

    await waitFor(() => {
      expect(screen.getByText('Laptop')).toBeInTheDocument()
      expect(screen.queryByText('Desk')).not.toBeInTheDocument()
    })
  })
})
