# Developer Guide

This guide provides detailed information for developers working on the HAY2010 Stock Management Application.

## Development Environment Setup

### Prerequisites

1. **Node.js 18+**
   ```bash
   node --version
   # Should show v18.x.x or higher
   ```

2. **PostgreSQL 14+**
   ```bash
   psql --version
   # Should show 14.x or higher
   ```

3. **Redis 7+**
   ```bash
   redis-server --version
   # Should show 7.x or higher
   ```

4. **Docker & Docker Compose** (optional)
   ```bash
   docker --version
   docker-compose --version
   ```

### Initial Setup

1. **Clone and install**
   ```bash
   git clone <repository-url>
   cd stock_app
   npm install
   ```

2. **Environment configuration**
   ```bash
   # Copy example environment files
   cp .env.example .env.local
   cp .env.docker.example .env.docker
   
   # Edit .env.local with your local configuration
   # Edit .env.docker for Docker deployments
   ```

3. **Database setup**
   ```bash
   # Using Docker (recommended for development)
   docker-compose up -d postgres redis
   
   # Or manually start PostgreSQL and Redis
   
   # Run database migrations
   npm run db:push
   
   # Seed initial data
   npm run db:seed
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## Architecture Overview

### Application Structure

```
app/
├── api/                    # API routes (Next.js Route Handlers)
│   ├── health/           # Health check endpoints
│   ├── metrics/          # Prometheus metrics endpoint
│   └── [other-api-routes]/
├── actions/              # Server Actions (Next.js 14)
│   ├── auth.ts          # Authentication actions
│   ├── stock.ts         # Stock management actions
│   └── [other-actions]/
└── [pages]/             # Application pages (Next.js App Router)

lib/
├── auth/                # Authentication utilities
│   ├── jwt.ts          # JWT token handling
│   └── session.ts      # Session management
├── db/                  # Database clients
│   ├── prisma.ts       # Prisma client singleton
│   ├── redis.ts # Redis client (cluster + single mode)
├── middleware/ # Custom middleware
│ └── rate-limit.ts # Rate limiting middleware
├── errors.ts           # Custom error classes
├── logger.ts           # Structured logging
└── utils/              # Utility functions
```

### Key Design Patterns

1. **Repository Pattern**: Database access through Prisma client
2. **Middleware Pattern**: Request processing pipeline
3. **Singleton Pattern**: Database and Redis clients
4. **Factory Pattern**: Logger and error creation
5. **Strategy Pattern**: Rate limiting algorithms

## Authentication & Authorization

### JWT Implementation

The application uses JWT tokens stored in HTTP-only cookies for authentication.

**Token Structure:**
```typescript
interface JWTPayload {
  userId: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER';
  sessionId: string;
  iat: number; // Issued at timestamp
  exp: number; // Expiration timestamp
}
```

**Token Verification:**
```typescript
import { verifyToken } from '@/lib/auth/jwt';

// Verify token in API routes
const payload = await verifyToken(token);
if (!payload) {
  // Invalid or expired token
}
```

### Role-Based Access Control (RBAC)

Four user roles with hierarchical permissions:

1. **ADMIN**: Full system access
   - User management
   - System configuration
   - All data operations

2. **MANAGER**: Operational management
   - Stock management
   - Document generation
   - User oversight (except ADMIN users)

3. **USER**: Standard operations
   - Stock movements
   - Document viewing
   - Basic reporting

4. **VIEWER**: Read-only access
   - View stock levels
   - View reports
   - No modifications

**Checking Permissions:**
```typescript
// In middleware or API routes
if (payload.role !== 'ADMIN' && payload.role !== 'MANAGER') {
  return NextResponse.json(
    { error: 'Insufficient permissions' },
    { status: 403 }
  );
}
```

## Database Schema

### Core Entities

1. **User**: System users with roles
2. **Product**: Product catalog
3. **Warehouse**: Storage locations
4. **Stock**: Current inventory levels
5. **StockMovement**: History of stock changes
6. **Document**: Generated documents
7. **Partner**: Business partners (suppliers/customers)

### Schema Relationships

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String   // bcrypt hash
  role      Role     @default(USER)
  // ... other fields
  
  // Relationships
  createdStockMovements StockMovement[] @relation("CreatedBy")
  createdDocuments      Document[]      @relation("CreatedBy")
}

model Stock {
  id          String   @id @default(cuid())
  productId   String
  warehouseId String
  quantity    Int      @default(0)
  
  // Relationships
  product   Product   @relation(fields: [productId], references: [id])
  warehouse Warehouse @relation(fields: [warehouseId], references: [id])
  movements StockMovement[]
}

model StockMovement {
  id          String   @id @default(cuid())
  type        MovementType
  quantity    Int
  previousQty Int
  newQty      Int
  
  // Relationships
  stock   Stock   @relation(fields: [stockId], references: [id])
  user    User    @relation("CreatedBy", fields: [createdById], references: [id])
}
```

### Audit Trail

All modifications include audit fields:
- `createdById`: User who created the record
- `createdAt`: Creation timestamp
- `updatedById`: User who last updated
- `updatedAt`: Last update timestamp

## Rate Limiting

### Configuration

Rate limits are configured in `lib/security/rate-limit.ts`:

```typescript
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  '/api/auth/login': { requests: 10, window: 60 },
  '/api/auth/register': { requests: 5, window: 300 },
  '/api/documents/generate-pdf': { requests: 20, window: 60 },
  '/api/stock': { requests: 200, window: 60 },
  'default': { requests: 500, window: 60 },
};
```

### Algorithms

1. **Sliding Window**: Used for critical paths (authentication)
   - More accurate but slower
   - Uses Redis sorted sets

2. **Fixed Window**: Used for non-critical paths
   - Faster but less accurate
   - Uses Redis INCR with expiry

### Circuit Breaker

If Redis becomes unavailable, the circuit breaker:
1. Records failures
2. Opens after 5 consecutive failures
3. Returns rate limit errors without Redis dependency
4. Resets after 60 seconds

## Error Handling

### Custom Error Classes

```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super('AUTHENTICATION_ERROR', message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super('AUTHORIZATION_ERROR', message, 403);
  }
}
```

### Error Middleware

All API errors are caught and formatted consistently:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { /* optional */ },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Logging

### Structured Logging with Pino

```typescript
import { createLogger } from '@/lib/logger';

const log = createLogger('module-name');

// Usage
log.info({ userId, action: 'login' }, 'User logged in');
log.error({ error: err.message, stack: err.stack }, 'Operation failed');
log.debug({ query, params }, 'Database query executed');
```

### Log Levels

1. **error**: Application errors
2. **warn**: Warning conditions
3. **info**: Informational messages
4. **debug**: Debug information (development only)

### Sensitive Data Redaction

Automatically redacts:
- Passwords
- Tokens
- API keys
- Personal information

## Testing

### Test Structure

```
src/__tests__/
├── unit/              # Unit tests
│   ├── auth.test.ts
│   └── utils.test.ts
├── integration/       # Integration tests
│   ├── api.test.ts
│   └── database.test.ts
└── e2e/              # End-to-end tests
    └── user-flows.test.ts
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:ci

# Run specific test file
npm test -- src/__tests__/health.test.ts

# Run tests in watch mode
npm test -- --watch

# Run tests with specific pattern
npm test -- --run "health"
```

### Writing Tests

**Unit Test Example:**
```typescript
import { describe, it, expect } from 'vitest';
import { validateEmail } from '@/lib/utils/validation';

describe('validation', () => {
  it('should validate email format', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('invalid-email')).toBe(false);
  });
});
```

**Integration Test Example:**
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/db/prisma';

describe('stock API', () => {
  beforeAll(async () => {
    // Setup test data
  });

  afterAll(async () => {
    // Cleanup test data
  });

  it('should create stock movement', async () => {
    const response = await fetch('/api/stock/movements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'INBOUND',
        productId: 'test-product',
        warehouseId: 'test-warehouse',
        quantity: 10,
      }),
    });
    
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toHaveProperty('id');
  });
});
```

## Performance Optimization

### Database Optimization

1. **Indexes**: All foreign keys and frequently queried fields are indexed
2. **Connection Pooling**: Prisma connection pool configured for optimal performance
3. **Query Optimization**: Use Prisma's `select` to fetch only needed fields

### Caching Strategy

1. **Redis Cache**:
   - Rate limiting data
   - Session information
   - Frequently accessed reference data

2. **Browser Cache**:
   - Static assets (images, fonts, CSS/JS)
   - API responses with appropriate cache headers

### Bundle Optimization

1. **Code Splitting**: Next.js automatic code splitting
2. **Tree Shaking**: Unused code removed from production bundles
3. **Optimized Imports**: `optimizePackageImports` in Next.js config

## Security Best Practices

### Input Validation

Always validate and sanitize inputs:

```typescript
import { z } from 'zod';

const stockMovementSchema = z.object({
  type: z.enum(['INBOUND', 'OUTBOUND', 'ADJUSTMENT']),
  productId: z.string().min(1),
  warehouseId: z.string().min(1),
  quantity: z.number().int().min(1).max(10000),
  reference: z.string().optional(),
  notes: z.string().max(500).optional(),
});

// Usage
const validated = stockMovementSchema.parse(requestBody);
```

### SQL Injection Prevention

Prisma uses parameterized queries automatically:

```typescript
// Safe - Prisma parameterizes queries
await prisma.stock.findMany({
  where: { productId: userInput },
});

// Also safe - Raw queries with parameters
await prisma.$queryRaw`
  SELECT * FROM stock 
  WHERE product_id = ${userInput}
`;
```

### XSS Prevention

1. **Content Security Policy**: Configured in `next.config.ts`
2. **Input Sanitization**: Validate and escape user inputs
3. **Output Encoding**: React automatically escapes content

## Deployment

### Environment Variables

Required for production:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Redis
REDIS_URL=redis://host:6379

# Authentication
JWT_SECRET=secure-random-string-minimum-32-chars
JWT_EXPIRES_IN=7d

# Application
NODE_ENV=production
PORT=3000

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
PROMETHEUS_METRICS_ENABLED=true
```

### Health Checks

Configure load balancers to use:
- `GET /api/health/public` for basic health checks
- Returns 200 OK when application is healthy
- Returns 503 Service Unavailable when degraded

### Monitoring

1. **Application Metrics**: Available at `/api/metrics`
2. **Business Metrics**: Custom metrics for stock operations
3. **Error Tracking**: Sentry integration
4. **Log Aggregation**: Structured logs for analysis

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Check PostgreSQL is running
   pg_isready -h localhost -p 5432
   
   # Check connection string
   echo $DATABASE_URL
   ```

2. **Redis Connection Errors**
   ```bash
   # Check Redis is running
   redis-cli ping
   # Should respond with PONG
   ```

3. **Rate Limiting Issues**
   - Check Redis connectivity
   - Verify rate limit configuration
   - Check circuit breaker status in logs

4. **Authentication Issues**
   - Verify JWT_SECRET is set
   - Check token expiration
   - Verify cookie settings

### Debug Logging

Enable debug logging for troubleshooting:

```bash
# Set log level to debug
LOG_LEVEL=debug npm run dev

# View structured logs
npm run dev 2>&1 | jq .
```

## Contributing

### Code Style

1. **TypeScript**: Strict mode enabled
2. **ESLint**: Custom configuration for Next.js
3. **Prettier**: Automatic code formatting
4. **Husky**: Pre-commit hooks

### Git Workflow

1. **Branch Naming**: `feature/description`, `fix/issue`, `docs/topic`
2. **Commit Messages**: Conventional commits
3. **Pull Requests**: Required for all changes
4. **Code Review**: At least one reviewer required

### Testing Requirements

1. **New Features**: Unit tests required
2. **Bug Fixes**: Test demonstrating the fix
3. **API Changes**: Integration tests required
4. **Security Changes**: Security tests required

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)