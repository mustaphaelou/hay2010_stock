# ============================================
# HAY2010 Stock Application - Makefile
# Version: 4.0
# ============================================
#
# Simplifies Docker and development commands
#
# Usage:
# make <target>
# make help       Show all targets
#
# ============================================

.PHONY: help
help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

# ============================================
# DOCKER DEPLOYMENT
# ============================================

.PHONY: up
up: ## Start Docker deployment
	docker compose up -d

.PHONY: down
down: ## Stop Docker deployment
	docker compose down

.PHONY: down-v
down-v: ## Stop Docker deployment and remove volumes
	docker compose down -v

.PHONY: rebuild
rebuild: ## Rebuild Docker images without cache
	docker compose build --no-cache
	docker compose up -d

.PHONY: logs
logs: ## View all logs
	docker compose logs -f

.PHONY: logs-app
logs-app: ## View app logs
	docker compose logs -f app

.PHONY: logs-db
logs-db: ## View PostgreSQL logs
	docker compose logs -f postgres

.PHONY: logs-redis
logs-redis: ## View Redis logs
	docker compose logs -f redis

.PHONY: psql
psql: ## Open PostgreSQL CLI
	docker exec -it hay2010_postgres psql -U postgres -d hay2010_db

.PHONY: redis-cli
redis-cli: ## Open Redis CLI
	docker exec -it hay2010_redis redis-cli

.PHONY: migrate
migrate: ## Run database migrations
	docker compose run --rm migrate

.PHONY: seed
seed: ## Seed database (use SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD env vars to customize)
	docker compose run --rm seed

.PHONY: db-reset
db-reset: ## Reset database (WARNING: destroys data)
	docker compose down -v
	docker compose up -d

.PHONY: health
health: ## Check service health
	@echo "Application health:"
	@curl -s http://localhost:3000/api/health/public | head -c 500
	@echo ""
	@echo ""
	@echo "Service status:"
	docker compose ps

.PHONY: backup
backup: ## Backup database to local file
	./scripts/local-backup.sh

.PHONY: restore
restore: ## Restore database from backup file (usage: make restore FILE=backup.sql)
	./scripts/local-restore.sh $(FILE)

# ============================================
# DEVELOPMENT
# ============================================

.PHONY: dev
dev: ## Start development server
	npm run dev

.PHONY: build
build: ## Build production application
	npm run build

.PHONY: lint
lint: ## Run linter
	npm run lint

.PHONY: lint-fix
lint-fix: ## Run linter with auto-fix
	npm run lint:fix

# ============================================
# TESTING
# ============================================

.PHONY: test
test: ## Run tests
	npm run test

.PHONY: test-ci
test-ci: ## Run tests with coverage (CI mode)
	npm run test:ci

.PHONY: test-security
test-security: ## Run security tests
	npm run test:security

.PHONY: test-health
test-health: ## Run health endpoint tests
	npm run test:health

# ============================================
# DATABASE
# ============================================

.PHONY: db-generate
db-generate: ## Generate Prisma client
	npm run db:generate

.PHONY: db-push
db-push: ## Push schema changes to database
	npm run db:push

.PHONY: db-seed
db-seed: ## Seed database (local dev)
	npm run db:seed

.PHONY: db-reset
db-reset: ## Reset database (local dev)
	npm run db:reset

# ============================================
# UTILITIES
# ============================================

.PHONY: clean
clean: ## Clean build artifacts
	rm -rf .next
	rm -rf out
	rm -rf coverage
	rm -rf node_modules/.cache

.PHONY: clean-all
clean-all: clean down-v ## Clean everything including volumes

.PHONY: info
info: ## Show environment information
	@echo "Node version: $(shell node --version)"
	@echo "npm version: $(shell npm --version)"
	@echo "Docker version: $(shell docker --version 2>/dev/null || echo 'not installed')"
	@echo "Docker Compose version: $(shell docker compose version 2>/dev/null || echo 'not installed')"

# ============================================
# DEFAULT TARGET
# ============================================

.PHONY: start
start: up ## Start Docker deployment (default)
