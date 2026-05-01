Phase 4: Admin UI & Docs
**4.1 API Key management page**
- `app/(dashboard)/admin/api-keys/page.tsx` — table: list keys, create form, revoke button
- Server Actions: `app/actions/api-keys.ts` — `createApiKey`, `listApiKeys`, `revokeApiKey`
**4.2 OpenAPI endpoint**
- `app/api/v1/openapi.json/route.ts` — serves the YAML as JSON
- `app/api/v1/docs/route.ts` — returns Scalar UI HTML page
---
New files to create (~25 files)
lib/api/
  auth.ts
  response.ts
  middleware.ts
  openapi.yaml
  validators/
    partenaires.ts
    produits.ts
    categories.ts
    entrepots.ts
    documents.ts
    affaires.ts
    niveaux-stock.ts
  handlers/
    partenaires.ts
    produits.ts
    categories.ts
    entrepots.ts
    documents.ts
    affaires.ts
    niveaux-stock.ts
app/api/v1/
  partenaires/route.ts, [id]/route.ts, [id]/documents/route.ts
  produits/route.ts, [id]/route.ts, [id]/niveaux-stock/route.ts
  categories/route.ts, [id]/route.ts, [id]/produits/route.ts
  entrepots/route.ts, [id]/route.ts, [id]/niveaux-stock/route.ts
  documents/route.ts, [id]/route.ts, [id]/lignes/route.ts
  affaires/route.ts, [id]/route.ts, [id]/documents/route.ts
  niveaux-stock/route.ts, [id]/route.ts
  openapi.json/route.ts
  docs/route.ts
app/actions/api-keys.ts
app/(dashboard)/admin/api-keys/page.tsx
src/__tests__/api/v1/ (test files mirroring handler structure)
Modified files (~3 files)
prisma/schema.prisma        (+1 model: ApiKey)
middleware.ts                (+PUBLIC_PATHS entry, +CORS logic)
.env.example                 (+API_CORS_ORIGINS)