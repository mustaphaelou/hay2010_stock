# HAY2010 Stock App — API Documentation

**Version:** 1.0.0 | **Base URL:** `https://your-domain.com/api/v1` | **Updated:** 2026-05-01

---

## 1. Introduction

L'API HAY2010 Stock App expose deux interfaces :

| Interface | Authentification | Usage |
|-----------|-----------------|-------|
| **REST API v1** | Clé API (`Bearer` token) | Intégrations externes, partenaires, scripts |
| **Server Actions** | Cookie JWT (session web) | Utilisé en interne par le front-end Next.js |

Le domaine métier est en français. Les ressources exposées : produits, catégories, partenaires (clients/fournisseurs), entrepôts, documents (ventes/achats), affaires, et niveaux de stock.

---

## 2. Authentification

### 2.1 REST API v1 — Clé API

**Format de clé :** `hay2010_sk_live_` suivi de 32 caractères hexadécimaux (48 caractères au total).

```
hay2010_sk_live_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4
```

**Transmission :** Header HTTP `Authorization` avec le schéma `Bearer`.

```bash
Authorization: Bearer hay2010_sk_live_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4
```

**Gestion des clés :** Seuls les rôles `ADMIN` et `MANAGER` peuvent créer/révoquer des clés via les Server Actions `createApiKey` / `revokeApiKey`.

### 2.2 Application Web — Cookie JWT

Le front-end utilise des cookies de session. Le flux :
1. `POST /login` (Server Action) → cookie `auth_token` (httpOnly, 7 jours)
2. Le middleware valide le JWT à chaque requête
3. L'utilisateur est propagé via les headers `x-user-id`, `x-user-email`, `x-user-role`

**CSRF :** Toute mutation nécessite un token CSRF obtenu via `GET /api/csrf-token`.

---

## 3. Format des Réponses

### 3.1 Succès

**Élément unique :**
```json
{ "id_produit": 1, "code_produit": "ART001", "nom_produit": "Article A", ... }
```

**Liste paginée :**
```json
{
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 250,
    "totalPages": 5,
    "hasMore": true
  }
}
```

**Création :** Statut `201 Created`

**Suppression :** Statut `204 No Content` (corps vide)

### 3.2 Erreurs

Toutes les erreurs suivent ce format :

```json
{
  "error": "Message lisible",
  "code": "CODE_ERREUR",
  "details": { "champ": "info supplémentaire" },
  "timestamp": "2026-05-01T10:30:00.000Z"
}
```

Le header `X-Error-Code` contient le code d'erreur.

**Codes d'erreur :**

| Code HTTP | Code Erreur | Signification |
|-----------|-------------|---------------|
| 400 | `VALIDATION_ERROR` | Données d'entrée invalides |
| 400 | `BAD_REQUEST` | Requête mal formée |
| 401 | `AUTHENTICATION_ERROR` | Clé API manquante ou invalide |
| 401 | `UNAUTHORIZED` | Authentification requise |
| 403 | `AUTHORIZATION_ERROR` | Permissions insuffisantes |
| 403 | `INSUFFICIENT_ROLE` | Rôle insuffisant (admin routes) |
| 403 | `CSRF_ERROR` | Jeton CSRF invalide |
| 404 | `NOT_FOUND` | Ressource introuvable |
| 409 | `CONFLICT` | Conflit (doublon, contrainte) |
| 422 | `BUSINESS_ERROR` | Règle métier violée |
| 429 | `RATE_LIMIT_EXCEEDED` | Limite de débit dépassée |
| 429 | `RATE_LIMITED` | Trop de requêtes |
| 500 | `DATABASE_ERROR` | Erreur base de données |
| 500 | `INTERNAL_ERROR` | Erreur interne |
| 502 | `EXTERNAL_SERVICE_ERROR` | Erreur service externe |

---

## 4. Rate Limiting

### API v1 (par clé API)

| Tier | Requêtes / minute |
|------|-------------------|
| `read` | 120 |
| `write` | 30 |

Headers de réponse : `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

En cas de dépassement, la réponse `429` inclut `retryAfter` (secondes).

### Application Web (par utilisateur/IP)

| Route | Limite | Fenêtre |
|-------|--------|---------|
| `/login` | 10 | 60s |
| `/register` | 5 | 300s |
| `/forgot-password` | 3 | 300s |
| `/stock/movements` | 100 | 60s |
| `/products` | 500 | 60s |
| Default | 500 | 60s |

---

## 5. Pagination, Tri et Filtrage

Toutes les routes `GET` de liste supportent :

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `page` | integer | 1 | Numéro de page (min 1) |
| `limit` | integer | 50 | Éléments par page (1-100) |
| `sort` | string | (varie) | Champ de tri |
| `order` | string | asc | `asc` ou `desc` |
| `search` | string | — | Recherche textuelle |

Exemple :
```
GET /api/v1/produits?search=article&sort=prix_vente&order=desc&page=1&limit=20
```

---

## 6. REST API v1 — Référence des Endpoints

### 6.1 Produits

#### `GET /api/v1/produits` — Lister les produits

**Paramètres :**

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Recherche dans code_produit, nom_produit |
| `categorie` | integer | Filtrer par ID de catégorie |
| `famille` | string | Filtrer par famille |
| `actif` | boolean | Filtrer par statut actif (`true`/`false`) |
| `sort` | string | `id_produit`, `code_produit`, `nom_produit`, `famille`, `prix_vente`, `prix_achat`, `date_creation`, `date_modification` |
| `order` | string | `asc` (défaut) ou `desc` |
| `page` | integer | Page (défaut: 1) |
| `limit` | integer | Éléments par page (défaut: 50, max: 100) |

**Réponse (200) :**
```json
{
  "data": [
    {
      "id_produit": 1,
      "code_produit": "ART001",
      "nom_produit": "Article Exemple",
      "id_categorie": 2,
      "famille": "Electronique",
      "description_produit": "Description détaillée",
      "code_barre_ean": "1234567890123",
      "unite_mesure": "UNITE",
      "poids_kg": 0.5,
      "volume_m3": 0.001,
      "prix_achat": 100.00,
      "prix_dernier_achat": 98.50,
      "coefficient": 1.5,
      "prix_vente": 150.00,
      "prix_gros": 130.00,
      "taux_tva": 20.00,
      "type_suivi_stock": "FIFO",
      "quantite_min_commande": 10,
      "niveau_reappro_quantite": 50,
      "stock_minimum": 20,
      "stock_maximum": 500,
      "activer_suivi_stock": true,
      "est_actif": true,
      "en_sommeil": false,
      "est_abandonne": false,
      "date_creation": "2026-01-15T10:00:00.000Z",
      "date_modification": "2026-05-01T08:30:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "totalPages": 1,
    "hasMore": false
  }
}
```

**Exemple cURL :**
```bash
curl -X GET "https://your-domain.com/api/v1/produits?search=article&page=1&limit=20" \
  -H "Authorization: Bearer hay2010_sk_live_YOUR_API_KEY" \
  -H "Accept: application/json"
```

**Exemple JavaScript :**
```javascript
const response = await fetch('/api/v1/produits?search=article&page=1&limit=20', {
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Accept': 'application/json'
  }
})
const { data, meta } = await response.json()
```

**Exemple Python :**
```python
import requests

response = requests.get(
    'https://your-domain.com/api/v1/produits',
    headers={'Authorization': f'Bearer {api_key}'},
    params={'search': 'article', 'page': 1, 'limit': 20}
)
products = response.json()
```

---

#### `POST /api/v1/produits` — Créer un produit

**Corps de la requête :**
```json
{
  "code_produit": "ART002",                    // Requis, unique
  "nom_produit": "Nouvel Article",             // Requis
  "id_categorie": 2,                           // Optionnel
  "famille": "Electronique",                   // Optionnel
  "description_produit": "Description...",     // Optionnel
  "code_barre_ean": "1234567890123",           // Optionnel
  "unite_mesure": "UNITE",                     // Optionnel
  "poids_kg": 0.5,                             // Optionnel
  "volume_m3": 0.001,                          // Optionnel
  "prix_achat": 100.00,                        // Optionnel
  "prix_dernier_achat": 98.50,                 // Optionnel
  "coefficient": 1.5,                          // Optionnel
  "prix_vente": 150.00,                        // Optionnel
  "prix_gros": 130.00,                         // Optionnel
  "taux_tva": 20.00,                           // Optionnel
  "type_suivi_stock": "FIFO",                  // Optionnel
  "quantite_min_commande": 10,                 // Optionnel
  "niveau_reappro_quantite": 50,               // Optionnel
  "stock_minimum": 20,                         // Optionnel
  "stock_maximum": 500,                        // Optionnel
  "activer_suivi_stock": true,                 // Optionnel
  "id_fournisseur_principal": 5,               // Optionnel
  "reference_fournisseur": "REF-FOURN-001",    // Optionnel
  "delai_livraison_fournisseur_jours": 7,      // Optionnel
  "est_actif": true,                           // Optionnel
  "en_sommeil": false,                         // Optionnel
  "est_abandonne": false,                      // Optionnel
  "compte_general_vente": "711000",            // Optionnel
  "compte_general_achat": "611000",            // Optionnel
  "code_taxe_vente": "TVA20",                  // Optionnel
  "code_taxe_achat": "TVA20"                   // Optionnel
}
```

**Réponse (201 Created) :** L'objet produit créé (même structure que GET).

**Erreurs possibles :**
- `400 VALIDATION_ERROR` — Données invalides (ex: code_produit manquant)
- `409 CONFLICT` — Code produit déjà existant

```bash
curl -X POST "https://your-domain.com/api/v1/produits" \
  -H "Authorization: Bearer hay2010_sk_live_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"code_produit": "ART002", "nom_produit": "Nouvel Article", "prix_vente": 150.00}'
```

---

#### `GET /api/v1/produits/{id}` — Détail d'un produit

**Paramètres :** `id` — ID du produit (entier)

**Réponse (200) :** Objet produit complet.

**Erreurs :** `404 NOT_FOUND` si l'ID n'existe pas.

---

#### `PUT /api/v1/produits/{id}` — Modifier un produit

Mêmes champs que POST, tous optionnels. Seuls les champs fournis sont modifiés.

**Erreurs :** `404 NOT_FOUND`, `409 CONFLICT` (code déjà utilisé)

---

#### `DELETE /api/v1/produits/{id}` — Désactiver un produit

Soft-delete : définit `est_actif = false`. **Réponse :** `204 No Content`.

---

#### `GET /api/v1/produits/{id}/niveaux-stock` — Niveaux de stock d'un produit

Retourne les niveaux de stock du produit par entrepôt.

**Réponse (200) :**
```json
{
  "data": [
    {
      "id_niveau_stock": 10,
      "id_produit": 1,
      "id_entrepot": 3,
      "quantite_en_stock": 150,
      "quantite_reservee": 20,
      "quantite_commandee": 30,
      "date_dernier_mouvement": "2026-05-01T09:00:00.000Z",
      "type_dernier_mouvement": "ENTREE",
      "entrepot": { "code_entrepot": "E001", "nom_entrepot": "Entrepôt Principal" }
    }
  ],
  "meta": { "page": 1, "limit": 50, "total": 1, "totalPages": 1, "hasMore": false }
}
```

---

### 6.2 Catégories de Produits

#### `GET /api/v1/categories-produits` — Lister les catégories

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Recherche dans code_categorie, nom_categorie |
| `parent` | integer | Filtrer par catégorie parente |
| `sort` | string | Champs disponibles : `id_categorie`, `code_categorie`, `nom_categorie`, `date_creation` |
| `page` / `limit` | integer | Pagination standard |

#### `POST /api/v1/categories-produits` — Créer une catégorie

```json
{
  "code_categorie": "CAT001",     // Requis
  "nom_categorie": "Électronique", // Requis
  "id_categorie_parent": null,     // Optionnel
  "description_categorie": "...",  // Optionnel
  "est_actif": true                // Optionnel
}
```

#### `GET /api/v1/categories-produits/{id}` — Détail d'une catégorie

#### `PUT /api/v1/categories-produits/{id}` — Modifier une catégorie

Note : ne peut pas se définir elle-même comme parent (anti-boucle).

#### `DELETE /api/v1/categories-produits/{id}` — Supprimer une catégorie

Hard delete. Bloqué si la catégorie a des enfants. **Réponse :** `204 No Content`. **Erreur :** `409 CONFLICT` si elle contient des sous-catégories.

#### `GET /api/v1/categories-produits/{id}/enfants` — Sous-catégories

Retourne les catégories enfants directes (paginé).

#### `GET /api/v1/categories-produits/{id}/produits` — Produits d'une catégorie

Retourne les produits appartenant à cette catégorie (paginé).

---

### 6.3 Partenaires (Clients & Fournisseurs)

#### `GET /api/v1/partenaires` — Lister les partenaires

| Param | Type | Description |
|-------|------|-------------|
| `type` | string | `CLIENT`, `FOURNISSEUR`, `LES_DEUX` |
| `search` | string | Recherche dans nom, code, ville |
| `sort` | string | `id_partenaire`, `code_partenaire`, `nom_partenaire`, `type_partenaire`, `ville`, `pays`, `date_creation`, `date_modification` |

**Réponse (200) :**
```json
{
  "data": [
    {
      "id_partenaire": 1,
      "code_partenaire": "CLI001",
      "nom_partenaire": "Société ABC",
      "type_partenaire": "CLIENT",
      "adresse_email": "contact@abc.ma",
      "numero_telephone": "+212522000000",
      "ville": "Casablanca",
      "pays": "Maroc",
      "numero_tva": "1234567",
      "numero_ice": "001234567000089",
      "delai_paiement_jours": 30,
      "limite_credit": 50000.00,
      "pourcentage_remise": 5.00,
      "est_actif": true,
      "date_creation": "2026-01-10T10:00:00.000Z"
    }
  ],
  "meta": { ... }
}
```

#### `POST /api/v1/partenaires` — Créer un partenaire

```json
{
  "code_partenaire": "CLI002",              // Requis, unique
  "nom_partenaire": "Nouveau Client",        // Requis
  "type_partenaire": "CLIENT",               // CLIENT | FOURNISSEUR | LES_DEUX
  "adresse_email": "contact@client.ma",
  "numero_telephone": "+212522111111",
  "numero_fax": "+212522111112",
  "url_site_web": "https://client.ma",
  "adresse_rue": "123 Rue Exemple",
  "code_postal": "20000",
  "ville": "Casablanca",
  "pays": "Maroc",
  "numero_tva": "1234567",
  "numero_ice": "001234567000089",
  "numero_rc": "RC12345",
  "delai_paiement_jours": 30,
  "limite_credit": 50000.00,
  "pourcentage_remise": 5.00,
  "numero_compte_bancaire": "123456789012345678901234",
  "code_banque": "011",
  "numero_iban": "MA64011519000001234567890123",
  "code_swift": "BCMAMAMC",
  "est_actif": true,
  "compte_collectif": "441100",
  "compte_auxiliaire": "441101"
}
```

#### `GET /api/v1/partenaires/{id}` — Détail d'un partenaire

#### `PUT /api/v1/partenaires/{id}` — Modifier un partenaire

#### `DELETE /api/v1/partenaires/{id}` — Désactiver un partenaire

Soft-delete : `est_actif = false`. **Réponse :** `204 No Content`.

#### `GET /api/v1/partenaires/{id}/documents` — Documents d'un partenaire

Retourne les documents liés à ce partenaire (paginé).

---

### 6.4 Entrepôts

#### `GET /api/v1/entrepots` — Lister les entrepôts

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Recherche textuelle |
| `principal` | boolean | Filtrer entrepôts principaux (`true`/`false`) |
| `sort` | string | `id_entrepot`, `code_entrepot`, `nom_entrepot`, `ville_entrepot`, `date_creation` |

**Réponse (200) :**
```json
{
  "data": [
    {
      "id_entrepot": 1,
      "code_entrepot": "E001",
      "nom_entrepot": "Entrepôt Principal",
      "adresse_entrepot": "Zone Industrielle",
      "ville_entrepot": "Casablanca",
      "code_postal_entrepot": "20000",
      "capacite_totale_unites": 10000,
      "nom_responsable": "Ahmed Alaoui",
      "email_responsable": "ahmed@example.com",
      "telephone_responsable": "+212522333333",
      "est_actif": true,
      "est_entrepot_principal": true,
      "date_creation": "2026-01-01T00:00:00.000Z"
    }
  ],
  "meta": { ... }
}
```

#### `POST /api/v1/entrepots` — Créer un entrepôt

```json
{
  "code_entrepot": "E002",                    // Requis
  "nom_entrepot": "Entrepôt Secondaire",       // Requis
  "adresse_entrepot": "Zone Industrielle 2",
  "ville_entrepot": "Rabat",
  "code_postal_entrepot": "10000",
  "capacite_totale_unites": 5000,
  "nom_responsable": "Fatima Benali",
  "email_responsable": "fatima@example.com",
  "telephone_responsable": "+212537000000",
  "est_actif": true,
  "est_entrepot_principal": false
}
```

#### `GET /api/v1/entrepots/{id}` — Détail d'un entrepôt

#### `PUT /api/v1/entrepots/{id}` — Modifier un entrepôt

#### `DELETE /api/v1/entrepots/{id}` — Désactiver un entrepôt

#### `GET /api/v1/entrepots/{id}/niveaux-stock` — Niveaux de stock d'un entrepôt

---

### 6.5 Documents (Ventes & Achats)

#### `GET /api/v1/documents` — Lister les documents

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Recherche dans numero_document, nom_partenaire_snapshot |
| `type_document` | string | Type de document (ex: `FACTURE`, `BON_LIVRAISON`) |
| `domaine_document` | string | `VENTE` (défaut) ou `ACHAT` |
| `statut_document` | string | `BROUILLON`, `CONFIRME`, `FACTURE`, `ANNULE`, etc. |
| `id_partenaire` | integer | Filtrer par partenaire |
| `id_affaire` | integer | Filtrer par affaire |
| `sort` | string | `id_document`, `numero_document`, `date_document`, `montant_ttc`, `statut_document`, `date_creation`, `date_modification` |

#### `POST /api/v1/documents` — Créer un document

```json
{
  "numero_document": "FAC-2026-001",          // Requis
  "type_document": "FACTURE",                  // Requis
  "domaine_document": "VENTE",                 // VENTE (défaut) ou ACHAT
  "etat_document": "Saisi",                    // Défaut: Saisi
  "id_partenaire": 1,                          // Requis
  "nom_partenaire_snapshot": "Société ABC",    // Optionnel
  "id_affaire": null,                          // Optionnel
  "numero_affaire": null,                      // Optionnel
  "date_document": "2026-05-01",               // Requis
  "date_echeance": "2026-06-01",
  "date_livraison": null,
  "date_livraison_prevue": "2026-05-15",
  "montant_ht": 1000.00,
  "montant_remise_total": 50.00,
  "montant_tva_total": 190.00,
  "montant_ttc": 1140.00,
  "solde_du": 1140.00,
  "code_devise": "MAD",
  "taux_change": 1.0,
  "statut_document": "BROUILLON",
  "est_entierement_paye": false,
  "id_entrepot": 1,
  "notes_internes": "Note interne",
  "notes_client": "Note visible par le client",
  "reference_externe": "REF-EXT-001",
  "mode_expedition": "Transporteur",
  "poids_total_brut": 25.0,
  "nombre_colis": 5
}
```

#### `GET /api/v1/documents/{id}` — Détail d'un document

Inclut les lignes de document et les infos du partenaire.

#### `PUT /api/v1/documents/{id}` — Modifier un document

#### `DELETE /api/v1/documents/{id}` — Annuler un document

Soft-cancel : `statut_document = 'ANNULE'`. **Réponse :** `204 No Content`.

#### `GET /api/v1/documents/{id}/lignes` — Lignes de document

Retourne les lignes du document (paginé).

---

### 6.6 Affaires

#### `GET /api/v1/affaires` — Lister les affaires

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Recherche textuelle |
| `type` | string | Type d'affaire |
| `statut` | string | Statut |
| `client` | string | Filtrer par client |
| `sort` | string | `id_affaire`, `code_affaire`, `intitule_affaire`, `date_debut`, `date_fin_prevue`, `chiffre_affaires`, `date_creation`, `date_modification` |

#### `POST /api/v1/affaires` — Créer une affaire

```json
{
  "code_affaire": "AFF-2026-001",             // Requis
  "intitule_affaire": "Projet Exemple",        // Requis
  "type_affaire": "Proposition",               // Défaut: Proposition
  "statut_affaire": "En cours",                // Défaut: En cours
  "abrege": "AFF001",                          // Optionnel
  "id_client": 1,                              // Optionnel
  "date_debut": "2026-05-01",
  "date_fin_prevue": "2026-08-01",
  "date_fin_reelle": null,
  "budget_prevu": 100000.00,
  "chiffre_affaires": 75000.00,
  "marge": 25000.00,
  "taux_remise_moyen": 5.00,
  "notes": "Notes sur l'affaire",
  "est_actif": true,
  "en_sommeil": false
}
```

#### `GET /api/v1/affaires/{id}` — Détail d'une affaire

Inclut les informations du client.

#### `PUT /api/v1/affaires/{id}` — Modifier une affaire

#### `DELETE /api/v1/affaires/{id}` — Désactiver une affaire

#### `GET /api/v1/affaires/{id}/documents` — Documents d'une affaire

---

### 6.7 Niveaux de Stock

#### `GET /api/v1/niveaux-stock` — Lister les niveaux de stock

| Param | Type | Description |
|-------|------|-------------|
| `produit` | integer | Filtrer par ID produit |
| `entrepot` | integer | Filtrer par ID entrepôt |
| `sort` | string | Champs disponibles |
| `page` / `limit` | integer | Pagination standard |

#### `POST /api/v1/niveaux-stock` — Créer un niveau de stock

```json
{
  "id_produit": 1,                     // Requis
  "id_entrepot": 3,                    // Requis
  "quantite_en_stock": 100,            // Requis
  "quantite_reservee": 10,             // Optionnel (défaut: 0)
  "quantite_commandee": 20,            // Optionnel (défaut: 0)
  "date_dernier_mouvement": null,      // Optionnel
  "type_dernier_mouvement": null       // Optionnel
}
```

**Contrainte :** Un couple `(id_produit, id_entrepot)` doit être unique.

---

## 7. Server Actions (API Interne)

Les Server Actions sont utilisées exclusivement par le front-end Next.js. Elles nécessitent un cookie de session JWT valide et, pour les mutations, un token CSRF.

### 7.1 Authentification

#### `login(email, password, rememberMe?, csrfToken?)`

```typescript
// Retourne { success: true } | { error: string }
const result = await login("admin@hay2010.com", "Admin@2026", false, csrfToken)
```

- Rate limit : 10 tentatives / 60s
- Verrouillage après 5 échecs (15 min)
- Cookie `auth_token` défini (7 ou 30 jours)

#### `logout(csrfToken?)`

#### `getCurrentUser()`

```typescript
// Retourne { id, email, name, role } | null
const user = await getCurrentUser()
```

#### `publicRegister(email, password, name, csrfToken?)`

```typescript
// Rate limit : 5 inscriptions / heure par IP
await publicRegister("user@example.com", "Password123!", "Jean Dupont", csrfToken)
```

#### `requestPasswordReset(email)`

Retourne toujours un succès (prévient l'énumération d'emails).

#### `validateResetTokenAction(token)`

```typescript
// { valid: boolean, email?: string, error?: string }
await validateResetTokenAction("reset-token-from-email")
```

#### `resetPassword(token, newPassword)`

---

### 7.2 Profil

#### `getUserProfile()`

Nécessite authentification.

#### `updateProfile(formData)`

```typescript
const form = new FormData()
form.append("name", "Nouveau Nom")
form.append("email", "nouveau@email.com")
form.append("currentPassword", "ancien-mot-de-passe")
form.append("csrfToken", csrfToken)
await updateProfile(form)
```

---

### 7.3 Clés API

Accessible uniquement aux rôles `ADMIN` et `MANAGER`.

#### `createApiKey(name)`

```typescript
// { id, name, keyPrefix: "hay2010_sk_live_", rawKey: "hay2010_sk_live_abc123..." }
const key = await createApiKey("Intégration ERP")
// ⚠️ rawKey n'est affiché qu'une seule fois
```

#### `listApiKeys()`

```typescript
// Liste des clés avec infos utilisateur
const keys = await listApiKeys()
```

#### `revokeApiKey(id)`

```typescript
await revokeApiKey("key-uuid-here")
```

---

### 7.4 Stock

#### `getArticlesWithStock(page?, limit?)`

Nécessite la permission `stock:read`.

```typescript
const articles = await getArticlesWithStock(1, 50)
```

#### `toggleArticleStatus(id_produit, newStatus, csrfToken)`

Nécessite `stock:write` + CSRF.

```typescript
await toggleArticleStatus(1, false, csrfToken)
```

#### `getStockLevels(page?, limit?)`

```typescript
const levels = await getStockLevels(1, 100)
```

#### `getDepots()`

```typescript
const warehouses = await getDepots()
```

#### `createStockMovement(input, csrfToken)`

Nécessite `stock:write` + CSRF.

```typescript
const result = await createStockMovement({
  productId: 1,
  warehouseId: 3,
  quantity: 50,
  type: "ENTREE",
  reference: "REF-LIV-001",
  motif: "Réception fournisseur"
}, csrfToken)
// { success: true, data: { movementId: 42, newQuantity: 150 } }
```

**Types de mouvement :** `ENTREE`, `SORTIE`, `TRANSFERT`, `INVENTAIRE`

Pour un transfert, ajouter `destinationWarehouseId`.

#### `getStockMovements(productId?, warehouseId?, limit?)`

```typescript
const movements = await getStockMovements(1, 3, 100)
```

---

### 7.5 Documents

Toutes ces actions nécessitent la permission `documents:read`.

#### `getDocuments(page?, limit?)`

Filtré par rôle : les utilisateurs `USER`/`VIEWER` ne voient que leurs documents.

#### `getSalesDocuments(page?, limit?)`

Documents de vente uniquement (`domaine = VENTE`).

#### `getPurchasesDocuments(page?, limit?)`

Documents d'achat uniquement (`domaine = ACHAT`).

#### `getDocLines(docId)`

Retourne les lignes d'un document.

---

### 7.6 Partenaires

#### `getPartners(type?, page?, limit?)`

Nécessite `partners:read`.

```typescript
const partners = await getPartners("CLIENT", 1, 50)
```

---

### 7.7 Affaires

#### `getAffaires()`

Nécessite `affairs:read`.

```typescript
const affairs = await getAffaires()
```

#### `getDocumentsByAffaire(code_affaire)`

```typescript
const docs = await getDocumentsByAffaire("AFF-2026-001")
```

---

### 7.8 Dashboard

#### `getDashboardStats()`

Nécessite authentification.

#### `getDashboardData()`

Retourne produits, partenaires, documents et mouvements.

---

## 8. Matrice des Permissions (RBAC)

Hiérarchie : `ADMIN (100) > MANAGER (50) > USER (25) > VIEWER (10)`

| Permission | ADMIN | MANAGER | USER | VIEWER |
|------------|:-----:|:-------:|:----:|:------:|
| `stock:read` | ✓ | ✓ | ✓ | ✓ |
| `stock:write` | ✓ | ✓ | ✓ | ✗ |
| `stock:delete` | ✓ | ✓ | ✗ | ✗ |
| `documents:read` | ✓ | ✓ | ✓ | ✓ |
| `documents:write` | ✓ | ✓ | ✓ | ✗ |
| `documents:delete` | ✓ | ✗ | ✗ | ✗ |
| `documents:export` | ✓ | ✓ | ✗ | ✗ |
| `partners:read` | ✓ | ✓ | ✓ | ✓ |
| `partners:write` | ✓ | ✓ | ✗ | ✗ |
| `partners:delete` | ✓ | ✗ | ✗ | ✗ |
| `users:read` | ✓ | ✓ | ✗ | ✗ |
| `users:write` | ✓ | ✗ | ✗ | ✗ |
| `users:delete` | ✓ | ✗ | ✗ | ✗ |
| `reports:view` | ✓ | ✓ | ✗ | ✗ |
| `reports:export` | ✓ | ✓ | ✗ | ✗ |
| `affairs:read` | ✓ | ✓ | ✓ | ✓ |
| `affairs:write` | ✓ | ✓ | ✓ | ✗ |
| `affairs:delete` | ✓ | ✗ | ✗ | ✗ |

---

## 9. Quick Start

### 9.1 Appeler l'API REST v1

```bash
# 1. Obtenir une clé API (via le dashboard admin)
# 2. Tester la connexion
curl -X GET "https://your-domain.com/api/v1/produits?limit=5" \
  -H "Authorization: Bearer hay2010_sk_live_YOUR_API_KEY"

# 3. Créer un partenaire
curl -X POST "https://your-domain.com/api/v1/partenaires" \
  -H "Authorization: Bearer hay2010_sk_live_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"code_partenaire": "CLI099", "nom_partenaire": "Test Client", "type_partenaire": "CLIENT"}'

# 4. Créer un document de vente
curl -X POST "https://your-domain.com/api/v1/documents" \
  -H "Authorization: Bearer hay2010_sk_live_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "numero_document": "FAC-TEST-001",
    "type_document": "FACTURE",
    "domaine_document": "VENTE",
    "id_partenaire": 1,
    "date_document": "2026-05-01",
    "montant_ht": 1000.00,
    "montant_tva_total": 200.00,
    "montant_ttc": 1200.00
  }'
```

### 9.2 Utiliser les Server Actions (front-end Next.js)

```typescript
// Dans un composant React
'use client'
import { login } from '@/app/actions/auth'

async function handleLogin() {
  const csrfToken = await fetchCsrfToken() // GET /api/csrf-token
  const result = await login("user@example.com", "password", false, csrfToken)
  if (result.success) {
    router.push("/")
  }
}
```

---

## 10. Endpoints Spéciaux

### `GET /api/health/public`
Health check public (Docker, load balancer). Teste la connectivité DB + Redis.
```json
{ "status": "ok", "checks": { "database": "ok", "redis": "ok", "app": "ok" } }
```

### `GET /api/health`
Health check admin détaillé (JWT ADMIN/MANAGER requis). Inclut latence DB/Redis, validation schema, et métriques système.

### `GET /api/metrics`
Métriques Prometheus (JWT + permission `reports:view` requis).

### `GET /api/csrf-token`
Génère un token CSRF. Supporte les requêtes anonymes (nécessaire pour login/register).

### `GET /api/invoices/{id}`
Génère un PDF de facture pour le document `id`. Accès : ADMIN, MANAGER, ou créateur du document.

### `GET /api/v1/docs`
Interface Scalar interactive (OpenAPI).

### `GET /api/v1/openapi.json`
Spécification OpenAPI 3.1.0 au format JSON.

---

## 11. SDKs & Outils

- **OpenAPI 3.1.0** : `/api/v1/openapi.json`
- **Scalar Docs** : `/api/v1/docs`
- **Postman** : Importer l'OpenAPI spec dans Postman pour générer une collection
- **Environnement** : `API_CORS_ORIGINS` et `SECURE_COOKIES` configurables via `.env.local`

---

## 12. Sécurité

- **Cookies** : httpOnly, SameSite=strict, Secure en production
- **JWT** : HS256, expiration configurable (défaut 24h), blocklist Redis
- **CSRF** : Double-submit cookie, token à usage unique, rotation automatique
- **API Keys** : Hash SHA-256 en base, préfixe `hay2010_sk_live_`, 48 caractères
- **Rate Limiting** : Sliding window Redis avec circuit breaker
- **CSP** : Nonce-based en production
- **CORS** : Configurable pour `/api/v1`
