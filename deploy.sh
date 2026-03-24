#!/bin/bash

# HAY2010 Stock Application Docker Deployment Script
# Usage: ./deploy.sh [command]
# Commands:
#   build       - Build Docker images
#   start       - Start all services
#   stop        - Stop all services
#   restart     - Restart all services
#   logs        - View logs
#   db-migrate  - Run database migrations
#   db-seed     - Seed the database
#   clean       - Remove all containers and volumes
#   status      - Check status of all services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="hay2010_stock"
COMPOSE_FILE="docker-compose.yml"

# Helper functions
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Commands
build() {
    print_status "Building Docker images..."
    docker-compose -f $COMPOSE_FILE --env-file .env.docker build --no-cache
    print_success "Build completed!"
}

start() {
    print_status "Starting all services..."
    docker-compose -f $COMPOSE_FILE --env-file .env.docker up -d
    print_status "Waiting for services to be healthy..."
    sleep 5

    # Check if services are running
    if docker ps | grep -q "hay2010_stock"; then
        print_success "Application is running at http://localhost:3000"
        print_status "Health check: http://localhost:3000/api/health"
    else
        print_error "Failed to start application"
        exit 1
    fi
}

stop() {
    print_status "Stopping all services..."
    docker-compose -f $COMPOSE_FILE --env-file .env.docker down
    print_success "Services stopped!"
}

restart() {
    print_status "Restarting all services..."
    stop
    start
}

logs() {
    print_status "Showing logs (Ctrl+C to exit)..."
    docker-compose -f $COMPOSE_FILE --env-file .env.docker logs -f
}

db_migrate() {
    print_status "Running database migrations..."
    docker-compose -f $COMPOSE_FILE --env-file .env.docker exec app npx prisma migrate deploy
    print_success "Migrations completed!"
}

db_seed() {
    print_status "Seeding database..."
    docker-compose -f $COMPOSE_FILE --env-file .env.docker exec app npx prisma db seed
    print_success "Database seeded!"
}

clean() {
    print_warning "This will remove all containers, volumes, and data!"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Removing all containers and volumes..."
        docker-compose -f $COMPOSE_FILE --env-file .env.docker down -v
        docker volume prune -f
        print_success "Cleanup completed!"
    else
        print_status "Cleanup cancelled."
    fi
}

status() {
    print_status "Checking service status..."
    echo ""
    docker-compose -f $COMPOSE_FILE --env-file .env.docker ps
    echo ""
    print_status "Health Check:"
    curl -s http://localhost:3000/api/health | jq . 2>/dev/null || echo "Health endpoint not ready yet"
}

# Main command handler
case "${1:-start}" in
    build)
        build
        ;;
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    logs)
        logs
        ;;
    db-migrate)
        db_migrate
        ;;
    db-seed)
        db_seed
        ;;
    clean)
        clean
        ;;
    status)
        status
        ;;
    *)
        echo "Usage: $0 {build|start|stop|restart|logs|db-migrate|db-seed|clean|status}"
        exit 1
        ;;
esac
