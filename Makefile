# ============================================
# HAY2010 Stock Application - Makefile
# Version: 3.0
# ============================================
#
# Simplifies Docker and development commands
#
# Usage:
#   make <target>
#   make help     # Show all targets
#
# ============================================

.PHONY: help
help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

# ============================================
# LOCAL DOCKER DEPLOYMENT
# ============================================

.PHONY: local-up
local-up: ## Start local Docker deployment
	docker-compose -f docker-compose.local.yml up -d

.PHONY: local-up-build
local-up-build: ## Start local Docker deployment with rebuild
	docker-compose -f docker-compose.local.yml up -d --build

.PHONY: local-down
local-down: ## Stop local Docker deployment
	docker-compose -f docker-compose.local.yml down

.PHONY: local-down-v
local-down-v: ## Stop local Docker deployment and remove volumes
	docker-compose -f docker-compose.local.yml down -v

.PHONY: local-logs
local-logs: ## View local deployment logs
	docker-compose -f docker-compose.local.yml logs -f

.PHONY: local-logs-app
local-logs-app: ## View app logs
	docker-compose -f docker-compose.local.yml logs -f app

.PHONY: local-logs-postgres
local-logs-postgres: ## View PostgreSQL logs
	docker-compose -f docker-compose.local.yml logs -f postgres

.PHONY: local-logs-redis
local-logs-redis: ## View Redis logs
	docker-compose -f docker-compose.local.yml logs -f redis

.PHONY: local-restart
local-restart: ## Restart all local services
	docker-compose -f docker-compose.local.yml restart

.PHONY: local-status
local-status: ## Show local service status
	docker-compose -f docker-compose.local.yml ps

.PHONY: local-rebuild
local-rebuild: ## Rebuild Docker images without cache
	docker-compose -f docker-compose.local.yml build --no-cache
	docker-compose -f docker-compose.local.yml up -d

.PHONY: local-psql
local-psql: ## Open PostgreSQL CLI
	docker exec -it hay2010_postgres psql -U postgres -d hay2010_db

.PHONY: local-redis-cli
local-redis-cli: ## Open Redis CLI
	docker exec -it hay2010_redis redis-cli

.PHONY: local-migrate
local-migrate: ## Run database migrations
	docker-compose -f docker-compose.local.yml run --rm migrate

.PHONY: local-seed
local-seed: ## Seed database
	docker-compose -f docker-compose.local.yml exec app npm run db:seed

.PHONY: local-db-reset
local-db-reset: ## Reset database (WARNING: destroys data)
	docker-compose -f docker-compose.local.yml down -v
	docker-compose -f docker-compose.local.yml up -d

.PHONY: local-health
local-health: ## Check service health
	@echo "Application health:"
	@curl -s http://localhost:3000/api/health | head -c 500
	@echo ""
	@echo ""
	@echo "Service status:"
	docker-compose -f docker-compose.local.yml ps

.PHONY: local-logs-tail
local-logs-tail: ## View last 100 lines of logs
	docker-compose -f docker-compose.local.yml logs --tail 100

# ============================================
# PRODUCTION DOCKER DEPLOYMENT
# ============================================

.PHONY: prod-up
prod-up: ## Start production Docker deployment
	docker-compose -f docker-compose.prod.yml up -d

.PHONY: prod-down
prod-down: ## Stop production Docker deployment
	docker-compose -f docker-compose.prod.yml down

.PHONY: prod-logs
prod-logs: ## View production logs
	docker-compose -f docker-compose.prod.yml logs -f

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

.PHONY: test-all
test-all: ## Run all tests
	npm run test:all

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
db-seed: ## Seed database
	npm run db:seed

.PHONY: db-reset
db-reset: ## Reset database
	npm run db:reset

# ============================================
# DOCKER BUILD
# ============================================

.PHONY: docker-build
docker-build: ## Build production Docker image
	docker build -t hay2010_stock:latest .

.PHONY: docker-build-local
docker-build-local: ## Build local Docker image
	docker build -f Dockerfile.local -t hay2010_stock:local .

.PHONY: docker-clean
docker-clean: ## Clean up Docker resources
	docker system prune -f
	docker builder prune -f

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
clean-all: clean local-down-v ## Clean everything including volumes

.PHONY: info
info: ## Show environment information
	@echo "Node version: $(shell node --version)"
	@echo "npm version: $(shell npm --version)"
	@echo "Docker version: $(shell docker --version 2>/dev/null || echo 'not installed')"
	@echo "Docker Compose version: $(shell docker-compose --version 2>/dev/null || echo 'not installed')"

# ============================================
# DEFAULT TARGET
# ============================================

.PHONY: start
start: local-up ## Start local deployment (default)