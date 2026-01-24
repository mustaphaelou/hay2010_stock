// TypeScript types for Supabase tables - Sage 100 Commercial Clone

// =====================================================
// PARTENAIRES (Clients & Fournisseurs)
// =====================================================
export interface Partenaire {
    id_partenaire: number
    code_partenaire: string
    nom_partenaire: string
    type_partenaire: 'CLIENT' | 'FOURNISSEUR' | 'LES_DEUX'
    adresse_email: string | null
    numero_telephone: string | null
    numero_fax: string | null
    url_site_web: string | null
    adresse_rue: string | null
    code_postal: string | null
    ville: string | null
    pays: string | null
    numero_tva: string | null
    numero_ice: string | null
    numero_rc: string | null
    delai_paiement_jours: number | null
    limite_credit: number | null
    pourcentage_remise: number | null
    numero_compte_bancaire: string | null
    code_banque: string | null
    numero_iban: string | null
    code_swift: string | null
    est_actif: boolean
    est_bloque: boolean
    date_creation: string
    date_modification: string
    cree_par: string | null
    modifie_par: string | null
    // Comptabilité
    compte_collectif: string | null
    compte_auxiliaire: string | null
}

// =====================================================
// CATEGORIES PRODUITS (Familles)
// =====================================================
export interface CategorieProduit {
    id_categorie: number
    code_categorie: string
    nom_categorie: string
    id_categorie_parent: number | null
    description_categorie: string | null
    est_actif: boolean
    date_creation: string
    date_modification: string
}

// =====================================================
// ENTREPOTS (Dépôts)
// =====================================================
export interface Entrepot {
    id_entrepot: number
    code_entrepot: string
    nom_entrepot: string
    adresse_entrepot: string | null
    ville_entrepot: string | null
    code_postal_entrepot: string | null
    capacite_totale_unites: number | null
    nom_responsable: string | null
    email_responsable: string | null
    telephone_responsable: string | null
    est_actif: boolean
    est_entrepot_principal: boolean
    date_creation: string
    date_modification: string
}

// =====================================================
// PRODUITS (Articles)
// =====================================================
export interface Produit {
    id_produit: number
    code_produit: string
    nom_produit: string
    id_categorie: number | null
    famille: string | null
    description_produit: string | null
    code_barre_ean: string | null
    unite_mesure: string
    poids_kg: number | null
    volume_m3: number | null
    // Prix
    prix_achat: number | null
    prix_dernier_achat: number | null
    coefficient: number | null
    prix_vente: number | null
    prix_gros: number | null
    taux_tva: number | null
    // Stock & Traceability
    type_suivi_stock: 'AUCUN' | 'SERIALISE' | 'LOT'
    quantite_min_commande: number | null
    niveau_reappro_quantite: number | null
    stock_minimum: number | null
    stock_maximum: number | null
    activer_suivi_stock: boolean
    // Fournisseur
    id_fournisseur_principal: number | null
    reference_fournisseur: string | null
    delai_livraison_fournisseur_jours: number | null
    // Statut
    est_actif: boolean
    en_sommeil: boolean
    est_abandonne: boolean
    // Audit
    date_creation: string
    date_modification: string
    cree_par: string | null
    modifie_par: string | null
    // Relations
    categories_produits?: CategorieProduit
    fournisseur_principal?: Partenaire
    // Comptabilité
    compte_general_vente: string | null
    compte_general_achat: string | null
    code_taxe_vente: string | null
    code_taxe_achat: string | null
}

// =====================================================
// TARIFS FOURNISSEURS
// =====================================================
export interface TarifFournisseur {
    id_tarif: number
    id_produit: number
    id_fournisseur: number
    reference_fournisseur: string | null
    prix_achat: number
    devise: string
    date_tarif: string
    quantite_min: number | null
    delai_livraison_jours: number | null
    est_fournisseur_principal: boolean
    est_actif: boolean
    date_creation: string
    date_modification: string
    // Relations
    produits?: Produit
    partenaires?: Partenaire
}

// =====================================================
// NIVEAUX STOCK (Stock par dépôt)
// =====================================================
export interface NiveauStock {
    id_stock: number
    id_produit: number
    id_entrepot: number
    quantite_en_stock: number
    quantite_reservee: number
    quantite_commandee: number
    date_dernier_mouvement: string | null
    type_dernier_mouvement: string | null
    date_creation: string
    date_modification: string
    // Relations
    produits?: Produit
    entrepots?: Entrepot
}

// =====================================================
// AFFAIRES (Projets / Codes Affaires)
// =====================================================
export type TypeAffaire = 'Proposition' | 'Accepté' | 'Perdu' | 'En cours' | 'En attente' | 'Terminé'

export interface Affaire {
    id_affaire: number
    code_affaire: string
    intitule_affaire: string
    type_affaire: TypeAffaire
    statut_affaire: string | null
    abrege: string | null
    id_client: number | null
    date_debut: string | null
    date_fin_prevue: string | null
    date_fin_reelle: string | null
    budget_prevu: number | null
    chiffre_affaires: number | null
    marge: number | null
    taux_remise_moyen: number | null
    notes: string | null
    est_actif: boolean
    en_sommeil: boolean
    date_creation: string
    date_modification: string
    cree_par: string | null
    modifie_par: string | null
    // Relations
    partenaires?: Partenaire
}

// =====================================================
// DOCUMENTS (Ventes & Achats)
// =====================================================
export type TypeDocument =
    | 'DEVIS' | 'BON_COMMANDE' | 'PREPARATION_LIVRAISON' | 'BON_LIVRAISON'
    | 'BON_RETOUR' | 'BON_AVOIR_FINANCIER' | 'FACTURE' | 'FACTURE_COMPTABILISEE'
    | 'DEMANDE_ACHAT' | 'PREPARATION_COMMANDE' | 'COMMANDE_ACHAT'
    | 'BON_RECEPTION' | 'FACTURE_ACHAT'

export type DomaineDocument = 'VENTE' | 'ACHAT'
export type EtatDocument = 'Saisi' | 'A comptabiliser' | 'Confirmé'
export type StatutDocument = 'BROUILLON' | 'CONFIRME' | 'EXPEDITION' | 'LIVRE' | 'FACTURE' | 'ANNULE' | 'POSTE'

export interface Document {
    id_document: number
    numero_document: string
    type_document: TypeDocument
    domaine_document: DomaineDocument
    etat_document: EtatDocument
    id_partenaire: number
    nom_partenaire_snapshot: string | null
    id_affaire: number | null
    numero_affaire: string | null
    date_document: string
    date_echeance: string | null
    date_livraison: string | null
    date_livraison_prevue: string | null
    // Montants
    montant_ht: number
    montant_remise_total: number
    montant_tva_total: number
    montant_ttc: number
    solde_du: number
    // Devise
    code_devise: string
    taux_change: number
    // Statut
    statut_document: StatutDocument
    est_entierement_paye: boolean
    // Entrepôt
    id_entrepot: number | null
    // Notes
    notes_internes: string | null
    notes_client: string | null
    reference_externe: string | null
    // Audit
    date_creation: string
    date_modification: string
    cree_par: string | null
    modifie_par: string | null
    // Relations
    partenaires?: Partenaire
    affaires?: Affaire
    entrepots?: Entrepot
    // Logistique
    mode_expedition: string | null
    poids_total_brut: number | null
    nombre_colis: number | null
}

// =====================================================
// LIGNES DOCUMENTS
// =====================================================
export type StatutLigne = 'EN_ATTENTE' | 'PARTIELLE' | 'COMPLETE' | 'ANNULEE'

export interface LigneDocument {
    id_ligne: number
    id_document: number
    numero_ligne: number
    id_affaire: number | null
    numero_affaire: string | null
    id_produit: number
    code_produit_snapshot: string | null
    nom_produit_snapshot: string | null
    // Quantités
    quantite_commandee: number
    quantite_livree: number
    quantite_facturee: number
    // Prix
    prix_unitaire_ht: number
    pourcentage_remise: number
    taux_tva: number
    // Montants
    montant_remise: number
    montant_ht: number
    montant_tva: number
    montant_ttc: number
    // Statut
    statut_ligne: StatutLigne
    notes_ligne: string | null
    // Audit
    date_creation: string
    date_modification: string
    // Relations
    documents?: Document
    produits?: Produit
    affaires?: Affaire
    id_lot: number | null
}

// =====================================================
// HISTORIQUE PRIX ACHATS
// =====================================================
export interface HistoriquePrixAchat {
    id_historique: number
    id_produit: number
    id_fournisseur: number | null
    id_document: number | null
    prix_achat: number
    quantite: number | null
    date_achat: string
    notes: string | null
    date_creation: string
    // Relations
    produits?: Produit
    partenaires?: Partenaire
    documents?: Document
}

// =====================================================
// MOUVEMENTS STOCK
// =====================================================
export type TypeMouvement = 'ENTREE' | 'SORTIE' | 'TRANSFERT' | 'AJUSTEMENT' | 'INVENTAIRE'

export interface MouvementStock {
    id_mouvement: number
    id_produit: number
    id_entrepot: number
    id_document: number | null
    id_ligne_document: number | null
    type_mouvement: TypeMouvement
    quantite: number
    date_mouvement: string
    reference_document: string | null
    motif: string | null
    cree_par: string | null
    date_creation: string
    // Relations
    produits?: Produit
    entrepots?: Entrepot
    documents?: Document
    id_lot: number | null
}

// =====================================================
// LOTS & SERIES (Traceability)
// =====================================================
export interface LotsSerie {
    id_lot: number
    code_lot: string
    id_produit: number
    date_fabrication: string | null
    date_peremption: string | null
    numero_serie_unique: string | null
    quantite_initiale: number | null
    quantite_actuelle: number
    est_actif: boolean
    date_creation: string
}

// =====================================================
// TARIFS EXCEPTIONNELS (Advanced Pricing)
// =====================================================
export interface TarifExceptionnel {
    id_tarif_ex: number
    id_produit: number | null
    id_client: number | null
    quantite_min: number | null
    prix_vente_fixe: number | null
    remise_pourcentage: number | null
    date_debut: string | null
    date_fin: string | null
    priorite: number | null
    date_creation: string
}

// =====================================================
// SAGE 100 STYLE TABLES (f_ prefix)
// =====================================================

// F_COMPTET: Clients/Fournisseurs (Accounts)
export type FComptetType = 0 | 1 | 2 // 0=Client, 1=Fournisseur, 2=Les deux

export interface FComptet {
    ct_num: string
    ct_type: FComptetType
    ct_intitule: string
    ct_qualite: string | null
    ct_contact: string | null
    ct_telephone: string | null
    ct_telecopie: string | null
    ct_email: string | null
    ct_site: string | null
    ct_adresse: string | null
    ct_complement: string | null
    ct_codepostal: string | null
    ct_ville: string | null
    ct_pays: string | null
    ct_identifiant: string | null
    ct_siret: string | null
    ct_ape: string | null
    ct_sommeil: boolean
    ct_controle_encours: boolean
    ct_encours: number | null
    ct_encours_max: number | null
    ct_solde: number | null
    ct_risque: number | null
    ct_bloque: boolean
    n_devise: number | null
    n_condition: number | null
    n_catcompta: number | null
    n_cattarif: number | null
    ct_taux_remise: number | null
    ct_compte_collectif: string | null
    ct_date_create: string
    ct_date_modif: string
}

// F_FAMILLE: Product Families
export interface FFamille {
    fa_codefamille: string
    fa_type: number
    fa_intitule: string
    fa_famillecentral: string | null
    fa_unitepoids: number | null
    fa_unitevente: string | null
    fa_coef: number | null
    fa_suvistock: boolean
    fa_codebarre: boolean
    fa_date_create: string
    fa_date_modif: string
}

// F_TAXE: Tax Codes
export interface FTaxe {
    ta_code: string
    ta_intitule: string
    ta_taux: number
    ta_type: number
    ta_sens: number
    ta_np: number
    ta_compte: string | null
    ta_date_create: string
}

// F_DEPOT: Warehouses
export interface FDepot {
    de_no: number
    de_intitule: string
    de_adresse: string | null
    de_complement: string | null
    de_codepostal: string | null
    de_ville: string | null
    de_pays: string | null
    de_contact: string | null
    de_telephone: string | null
    de_email: string | null
    de_principal: boolean
    de_cloture: boolean
    de_date_create: string
    de_date_modif: string
}

// F_ARTICLE: Products
export type FArticleSuiviSerie = 0 | 1 | 2 // 0=Aucun, 1=Série, 2=Lot

export interface FArticle {
    ar_ref: string
    ar_design: string
    ar_descompl: string | null
    fa_codefamille: string | null
    ar_type: number
    ar_unitepoids: number | null
    ar_poidsnet: number | null
    ar_poidsbrut: number | null
    ar_unitevente: string | null
    ar_prixach: number | null
    ar_prixven: number | null
    ar_coef: number | null
    ar_prixttc: number | null
    ta_code_vente: string | null
    ta_code_achat: string | null
    ar_gamme1: string | null
    ar_gamme2: string | null
    ar_codebarre: string | null
    ar_suiviserie: FArticleSuiviSerie
    ar_suivistock: boolean
    ar_sommeil: boolean
    ar_publie: boolean
    ar_photo: string | null
    ar_stockmini: number | null
    ar_stockmaxi: number | null
    ar_delailivr: number | null
    ct_num_fournisseur: string | null
    ar_ref_fournisseur: string | null
    ar_date_create: string
    ar_date_modif: string
    // Relations
    f_famille?: FFamille
    f_comptet?: FComptet
}

// F_ARTSTOCK: Stock by Depot
export interface FArtstock {
    ar_ref: string
    de_no: number
    as_qtesto: number | null
    as_qtecom: number | null
    as_qteres: number | null
    as_montsto: number | null
    as_cmup: number | null
    as_derniermvt: string | null
    as_date_create: string
    as_date_modif: string
    // Relations
    f_article?: FArticle
    f_depot?: FDepot
}

// F_DOCENTETE: Document Headers
export type FDocenteteDomaine = 0 | 1 | 2 | 3 // 0=Vente, 1=Achat, 2=Stock, 3=Interne

export interface FDocentete {
    cbmarq: number
    do_domaine: FDocenteteDomaine
    do_type: number
    do_piece: string
    do_date: string
    do_ref: string | null
    do_tiers: string | null
    do_period: number | null
    do_devise: number | null
    de_no: number | null
    do_totalht: number | null
    do_tva: number | null
    do_totalttc: number | null
    do_net: number | null
    do_montregl: number | null
    do_txescompte: number | null
    do_escompte: number | null
    do_statut: number
    do_transfere: number
    do_cloture: number
    do_imprime: number
    do_expedit: number | null
    do_nbcolis: number | null
    do_poids: number | null
    do_datelivr: string | null
    do_coord: string | null
    do_typecolis: string | null
    do_transaction: number | null
    ca_num: string | null
    do_date_create: string
    do_date_modif: string
    // Relations
    f_comptet?: FComptet
    f_depot?: FDepot
}

// F_DOCLIGNE: Document Lines
export interface FDocligne {
    cbmarq: number
    do_domaine: number
    do_type: number
    do_piece: string
    dl_ligne: number
    ar_ref: string | null
    dl_design: string | null
    dl_qte: number | null
    dl_qtebl: number | null
    dl_qtebc: number | null
    dl_prixunitaire: number | null
    dl_puttc: number | null
    dl_remise01_taux: number | null
    dl_remise01_montant: number | null
    dl_remise02_taux: number | null
    dl_remise02_montant: number | null
    dl_remise03_taux: number | null
    dl_remise03_montant: number | null
    dl_montantht: number | null
    dl_montanttva: number | null
    dl_montantttc: number | null
    ta_code: string | null
    dl_tva: number | null
    de_no: number | null
    dl_cmup: number | null
    dl_valorise: boolean | null
    dl_datebc: string | null
    dl_datebl: string | null
    ca_num: string | null
    ct_num: string | null
    dl_ref_piece: string | null
    dl_typecolis: string | null
    dl_poids: number | null
    dl_date_create: string
    // Relations
    f_article?: FArticle
    f_taxe?: FTaxe
    f_depot?: FDepot
    f_comptet?: FComptet
}

// F_TARIF: Tariffs
export interface FTarif {
    cbmarq: number
    ar_ref: string
    ta_type: number
    ct_num: string | null
    ta_cattarif: number | null
    ta_qtemin: number | null
    ta_qtemax: number | null
    ta_prixttc: number | null
    ta_prixht: number | null
    ta_remise: number | null
    ta_devise: number | null
    ta_date_debut: string | null
    ta_date_fin: string | null
    ta_date_create: string
    // Relations
    f_article?: FArticle
    f_comptet?: FComptet
}

// F_DOCREGL: Payment Schedules
export interface FDocregl {
    cbmarq: number
    do_domaine: number
    do_type: number
    do_piece: string
    dr_ligne: number
    dr_date: string
    dr_montant: number
    dr_montantregle: number | null
    dr_libelle: string | null
    dr_pourcent: number | null
    n_reglement: number | null
    dr_regle: boolean
    dr_date_create: string
}

// F_CREGLEMENT: Client/Supplier Payments
export type FCreglementType = 0 | 1 // 0=Encaissement, 1=Décaissement
export type FCreglementMode = 1 | 2 | 3 | 4 | 5 | 6 // 1=Espèces, 2=Chèque, 3=CB, 4=Virement, 5=Prélèvement, 6=LCR

export interface FCreglement {
    cbmarq: number
    rg_no: number
    rg_type: FCreglementType
    ct_num: string
    rg_date: string
    rg_reference: string | null
    rg_libelle: string | null
    rg_montant: number
    rg_montantdev: number | null
    n_reglement: FCreglementMode | null
    rg_impute: boolean
    rg_compta: boolean
    jo_num: string | null
    rg_effet: boolean
    rg_type_effet: number | null
    rg_num_effet: string | null
    rg_date_effet: string | null
    rg_banque: string | null
    rg_piece: string | null
    de_no: number | null
    rg_date_create: string
    rg_date_modif: string
    // Relations
    f_comptet?: FComptet
    f_depot?: FDepot
}

// F_REGLECH: Payment/Invoice Link
export interface FReglech {
    cbmarq: number
    rg_no: number
    do_domaine: number
    do_type: number
    do_piece: string
    rc_montant: number
    rc_montantdev: number | null
    rc_date_create: string
}

// =====================================================
// VIEWS (for typed queries)
// =====================================================
export interface VueArticleComplet {
    id_produit: number
    reference_article: string
    designation: string
    famille: string | null
    sous_famille: string | null
    unite: string
    stock_reel: number
    prix_achat: number | null
    prix_dernier_achat: number | null
    coefficient: number | null
    prix_vente: number | null
    taux_tva: number | null
    fournisseur_principal: string | null
    reference_fournisseur: string | null
    est_actif: boolean
    en_sommeil: boolean
}

export interface VueStockDepot {
    id_produit: number
    reference_article: string
    designation: string
    famille: string | null
    code_entrepot: string
    depot: string
    stock_reel: number
    quantite_reservee: number
    quantite_commandee: number
    stock_disponible: number
    valeur_stock: number | null
}

export interface VueInterrogationCommerciale {
    id_affaire: number
    code_affaire: string
    intitule_affaire: string
    type_affaire: TypeAffaire
    numero_document: string | null
    date_document: string | null
    client: string | null
    quantite: number | null
    designation: string | null
    pu_ht: number | null
    pu_ttc: number | null
    montant_ht: number | null
}

// =====================================================
// DATABASE TYPE
// =====================================================
export interface Database {
    public: {
        Tables: {
            partenaires: {
                Row: Partenaire
                Insert: Partial<Partenaire> & { code_partenaire: string; nom_partenaire: string; type_partenaire: Partenaire['type_partenaire'] }
                Update: Partial<Partenaire>
            }
            categories_produits: {
                Row: CategorieProduit
                Insert: Partial<CategorieProduit> & { code_categorie: string; nom_categorie: string }
                Update: Partial<CategorieProduit>
            }
            produits: {
                Row: Produit
                Insert: Partial<Produit> & { code_produit: string; nom_produit: string }
                Update: Partial<Produit>
            }
            entrepots: {
                Row: Entrepot
                Insert: Partial<Entrepot> & { code_entrepot: string; nom_entrepot: string }
                Update: Partial<Entrepot>
            }
            affaires: {
                Row: Affaire
                Insert: Partial<Affaire> & { code_affaire: string; intitule_affaire: string }
                Update: Partial<Affaire>
            }
            documents: {
                Row: Document
                Insert: Partial<Document> & { numero_document: string; type_document: TypeDocument; id_partenaire: number }
                Update: Partial<Document>
            }
            lignes_documents: {
                Row: LigneDocument
                Insert: Partial<LigneDocument> & { id_document: number; id_produit: number; prix_unitaire_ht: number }
                Update: Partial<LigneDocument>
            }
            niveaux_stock: {
                Row: NiveauStock
                Insert: Partial<NiveauStock> & { id_produit: number; id_entrepot: number }
                Update: Partial<NiveauStock>
            }
            tarifs_fournisseurs: {
                Row: TarifFournisseur
                Insert: Partial<TarifFournisseur> & { id_produit: number; id_fournisseur: number; prix_achat: number }
                Update: Partial<TarifFournisseur>
            }
            historique_prix_achats: {
                Row: HistoriquePrixAchat
                Insert: Partial<HistoriquePrixAchat> & { id_produit: number; prix_achat: number }
                Update: Partial<HistoriquePrixAchat>
            }
            mouvements_stock: {
                Row: MouvementStock
                Insert: Partial<MouvementStock> & { id_produit: number; id_entrepot: number; type_mouvement: TypeMouvement; quantite: number }
                Update: Partial<MouvementStock>
            }
            lots_serie: {
                Row: LotsSerie
                Insert: Partial<LotsSerie> & { code_lot: string; id_produit: number }
                Update: Partial<LotsSerie>
            }
            tarifs_exceptionnels: {
                Row: TarifExceptionnel
                Insert: Partial<TarifExceptionnel>
                Update: Partial<TarifExceptionnel>
            }
        }
        Views: {
            vue_articles_complet: {
                Row: VueArticleComplet
            }
            vue_stock_depot: {
                Row: VueStockDepot
            }
            vue_interrogation_commerciale: {
                Row: VueInterrogationCommerciale
            }
        }
    }
}
