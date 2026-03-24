# HAY2010 Stock Application - Docker Deployment Guide

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 2GB RAM available
- Ports 3000, 5432, and 6379 available

## Quick Start

### 1. Configure Environment Variables

Edit `.env.docker` file with your production settings:

```bash
# Important: Change these values for production!
POSTGRES_PASSWORD=YourSecurePasswordHere
JWT_SECRET=YourSecureJWTSecretHere
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 2. Deploy the Application

```bash
# Make the deployment script executable (Linux/Mac)
chmod +x deploy.sh

# Build and start all services
./deploy.sh build
./deploy.sh start

# Or use docker-compose directly
docker-compose --env-file .env.docker up -d
```

### 3. Run Database Migrations

```bash
./deploy.sh db-migrate
```

### 4. Seed the Database (Optional)

```bash
./deploy.sh db-seed
```

## Available Commands

| Command | Description |
|---------|-------------|
| `./deploy.sh build` | Build Docker images |
| `./deploy.sh start` | Start all services |
| `./deploy.sh stop` | Stop all services |
| `./deploy.sh restart` | Restart all services |
| `./deploy.sh logs` | View real-time logs |
| `./deploy.sh db-migrate` | Run database migrations |
| `./deploy.sh db-seed` | Seed database with initial data |
| `./deploy.sh status` | Check service status |
| `./deploy.sh clean` | Remove all containers and volumes |

## Services

| Service | Container Name | Port | Description |
|---------|---------------|------|-------------|
| Next.js App | `hay2010_stock` | 3000 | Main application |
| PostgreSQL | `hay2010_postgres` | 5432 | Database |
| Redis | `hay2010_redis` | 6379 | Session cache |

## Health Checks

- Application: `http://localhost:3000/api/health`
- PostgreSQL: Built-in health check via `pg_isready`
- Redis: Built-in health check via `redis-cli ping`

## Persistent Data

Data is persisted using Docker volumes:
- `postgres_data`: PostgreSQL database files
- `redis_data`: Redis persistent storage

## Production Deployment

### Using a Reverse Proxy (nginx)

Create `nginx.conf`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### SSL/TLS with Let's Encrypt

Use certbot to obtain SSL certificates:

```bash
certbot --nginx -d your-domain.com
```

### Environment Variables for Production

Update `.env.docker`:

```env
# Security
JWT_SECRET=use-a-strong-random-secret-here-min-32-chars
SECURE_COOKIES=true

# Database
POSTGRES_PASSWORD=very-strong-password-here

# Application
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production
```

## Troubleshooting

### Container won't start

```bash
# Check logs
./deploy.sh logs

# Check specific service
docker logs hay2010_stock
docker logs hay2010_postgres
docker logs hay2010_redis
```

### Database connection issues

```bash
# Verify PostgreSQL is running
docker ps | grep postgres

# Check database health
docker exec hay2010_postgres pg_isready -U postgres

# Access PostgreSQL shell
docker exec -it hay2010_postgres psql -U postgres -d hay2010_db
```

### Reset everything

```bash
./deploy.sh clean
./deploy.sh build
./deploy.sh start
./deploy.sh db-migrate
```

## Updates

To update the application:

```bash
# Pull latest code (if using git)
git pull origin main

# Rebuild and restart
./deploy.sh stop
./deploy.sh build
./deploy.sh start
./deploy.sh db-migrate
```

## Backup and Restore

### Backup Database

```bash
docker exec hay2010_postgres pg_dump -U postgres hay2010_db > backup.sql
```

### Restore Database

```bash
docker exec -i hay2010_postgres psql -U postgres -d hay2010_db < backup.sql
```

## Security Considerations

1. **Change default passwords** in `.env.docker`
2. **Use strong JWT secrets** (minimum 32 characters)
3. **Enable firewall** rules for production
4. **Regular updates** of Docker images
5. **SSL/TLS certificates** for HTTPS
6. **Database backups** scheduled regularly

## Support

For issues or questions, please refer to the project documentation or contact the development team.
