1. Fix Stale Cache After Mutations
Files: lib/api/handlers/{produits,partenaires,documents,affaires,entrepots,niveaux-stock,categories-produits}.ts
- Import and call cacheInvalidation.invalidateNamespace() after each create/update/delete handler
- Each handler currently creates/updates/deletes but never invalidates its namespace cache
- This means API consumers get stale list data for up to TTL duration after writes
2. Add Field Scoping to List Endpoints
Files: lib/api/handlers/{produits,partenaires,documents,affaires,entrepots,niveaux-stock,categories-produits}.ts
- Add select clause to all findMany calls in list handlers
- Return only fields needed for list display (exclude large/unused columns)
- Expected payload reduction: 60-80% for list responses
3. Add Trigrams Indexes for Text Search
Files: prisma/schema.prisma, migration
- Enable pg_trgm extension
- Add gin_trgm_ops indexes on: nom_produit, code_produit, code_barre_ean, nom_partenaire, ville, code_partenaire, nom_partenaire_snapshot, reference_externe, numero_document
- This dramatically improves contains + mode: 'insensitive' query performance
4. Remove Hardcoded API Key
File: scripts/create-api-key.ts
- Replace hardcoded key string with environment variable or interactive prompt
- Rotate any keys that may have been created with this script
5. Enable Fail-Closed Rate Limiting & Lockout
Files: lib/auth/lockout.ts, lib/auth/config.ts, environment configs
- Set LOCKOUT_FAIL_CLOSED=true and RATE_LIMIT_FAIL_CLOSED=true as defaults
- Update .env.example, .env.docker.example to reflect production-safe defaults
- Add to env validation (lib/config/env-validation.ts) if not present
6. Add Rate Limiting to Password Reset
Files: app/actions/password-reset.ts, lib/auth/lockout.ts
- Add IP-based rate limiting to requestPasswordReset (similar to registration: 5 attempts per hour per IP)
- Cap reset tokens per email (max 3 per hour) to prevent Redis storage exhaustion
7. Add Audit Log Table
Files: prisma/schema.prisma (new model), lib/audit/ (new module)
- Add AuditLog model: id, userId, action, resource, resourceId, details (JSON), ipAddress, createdAt
- Create lib/audit/audit-service.ts with logEvent() helper
- Wire into: login/logout, password changes, API key create/revoke, profile updates, failed login attempts
8. Patch OpenAPI Spec
File: lib/api/openapi.yaml
- Add missing error response schemas (ValidationError, AuthError, RateLimitError)
- Add rateLimiting headers to response documentation
- Add example request/response bodies for POST/PUT endpoints
- Verify all endpoint paths are documented