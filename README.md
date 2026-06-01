# HAY2010 — Gestion Commerciale &amp; Stock

Application ERP francophone destinée au marché marocain pour la gestion des stocks, ventes, achats, partenaires et affaires.

## Tech Stack

| Couche | Technologie |
|--------|-------------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, shadcn/ui, Tailwind CSS 4, Recharts |
| Base de données | PostgreSQL 16 via Prisma ORM |
| Cache / Files | Redis 7 (BullMQ) |
| Auth | JWT (jose) + API keys |
| PDF | @react-pdf/renderer |
| Tests | Vitest, Testing Library |
| Logs | Pino, Sentry |
| CI / CD | GitHub Actions, Docker, GHCR |
| Déploiement | Docker Compose (VPS) |

## Structure du projet

```
hay2010_stock/
├── app/                    # Next.js App Router pages
│   ├── (dashboard)/        # Pages protégées (ERP)
│   ├── api/                # API routes (REST + health)
│   ├── login/              # Authentification
│   └── ...
├── components/
│   ├── erp/                # Composants métier
│   └── ui/                 # Composants shadcn/ui
├── lib/
│   ├── api/                # Handlers REST
│   ├── auth/               # Authentification JWT
│   ├── stock/              # Moteur de gestion de stock
│   ├── documents/          # Documents de vente/achat
│   ├── partners/           # Gestion des partenaires
│   ├── affaires/           # Gestion des affaires
│   └── ...
├── prisma/
│   └── schema.prisma       # Modèle de données
├── docker-compose.yml      # Stack complète (dev)
├── docker-compose.prod.yml # Stack production
└── Dockerfile              # Build multi-stage
```

## Prérequis

- Node.js 20
- Docker &amp; Docker Compose

## Démarrage rapide (développement)

```bash
# 1. Cloner le dépôt
git clone <url>
cd hay2010_stock

# 2. Copier les variables d'environnement
cp .env.example .env

# 3. Lancer PostgreSQL + Redis (Docker)
make up

# 4. Exécuter les migrations et le seed
make seed

# 5. Lancer le serveur de développement
make dev
```

L'application est accessible sur `http://localhost:3000`.

## Déploiement Docker (production)

```bash
# Démarrer la stack complète
make up

# Ou manuellement
docker compose up -d

# Voir les logs
make logs

# Vérifier l'état de santé
make health
```

## Commandes principales

| Commande | Description |
|----------|-------------|
| `make up` / `make down` | Démarrer / arrêter la stack Docker |
| `make dev` | Serveur de développement Next.js |
| `make build` | Build de production |
| `make lint` | ESLint |
| `make test` | Tests unitaires (Vitest) |
| `make seed` | Initialiser la BDD avec des données de démo |
| `make migrate` | Appliquer les migrations Prisma |
| `make psql` | CLI PostgreSQL dans le conteneur |
| `make db-reset` | Réinitialiser la base de données |
| `make backup` / `make restore` | Sauvegarde / restauration de la BDD |

## CI / CD

Le pipeline GitHub Actions s'exécute en 5 étapes :

1. **Qualité** — ESLint, TypeScript, Prisma validate, Hadolint, npm audit, Gitleaks
2. **Sécurité** — CodeQL, Trivy (filesystem)
3. **Tests** — Vitest avec couverture, validation des migrations, sécurité des headers
4. **Build &amp; Publish** — Image Docker multi-arch, scan Trivy, SBOM, signature Cosign → GHCR
5. **Déploiement** — Staging (automatique sur main/develop) → Production (sur release)

Environnements :
- **Staging** : `https://staging.hay2010.com`
- **Production** : `https://app.hay2010.com`

## Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `DATABASE_URL` | URL de connexion PostgreSQL | `postgresql://postgres:devpass@postgres:5432/hay2010_db` |
| `REDIS_URL` | URL de connexion Redis | `redis://redis:6379` |
| `JWT_SECRET` | Clé secrète pour les tokens JWT | — |
| `SENTRY_DSN` | DSN Sentry (optionnel) | — |

Tester

```bash
npm run test         # Mode watch
npm run test:ci      # Mode CI avec couverture
npm run test:security # Tests de sécurité
```

## Licence

MIT
