# Administrator Guide

This guide provides comprehensive instructions for system administrators of the HAY2010 Stock Management Application.

## Table of Contents

1. [System Administration](#system-administration)
2. [User Management](#user-management)
3. [System Configuration](#system-configuration)
4. [Monitoring & Maintenance](#monitoring--maintenance)
5. [Security Management](#security-management)
6. [Backup & Recovery](#backup--recovery)
7. [Troubleshooting](#troubleshooting)

## System Administration

### Accessing Admin Features

1. **Admin Dashboard**
   - Login with ADMIN credentials
   - Navigate to "Admin" → "Dashboard"
   - Overview of system health and metrics

2. **Admin Navigation**
   - **System**: Health, logs, configuration
   - **Users**: User management, roles, permissions
   - **Security**: Audit logs, security settings
   - **Data**: Backup, restore, data management
   - **Monitoring**: Metrics, alerts, performance

### System Health Monitoring

#### Health Check Endpoints

1. **Public Health Check**
   ```
   GET /api/health/public
   ```
   - Returns basic application status
   - No authentication required
   - Used by load balancers and monitoring tools

2. **Admin Health Check**
   ```
   GET /api/health
   ```
   - Requires ADMIN authentication
   - Returns detailed system status:
     - Database connectivity
     - Redis connectivity
     - Schema validation
     - Service latencies
     - Version information

#### Health Check Response

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "checks": {
    "database": true,
    "redis": true,
    "schema": true
  },
  "services": {
    "database": "connected",
    "redis": "connected",
    "app": "running"
  },
  "latency": {
    "database": 15,
    "redis": 2
  },
  "version": "0.1.0",
  "environment": "production",
  "isAdmin": true
}
```

### System Logs

#### Accessing Logs

1. **Application Logs**
   - Location: Standard output (Docker) or log files
   - Format: Structured JSON
   - Retention: 30 days

2. **Audit Logs**
   - Navigate to "Admin" → "Audit Logs"
   - Filter by user, action, date range
   - Export to CSV for analysis

3. **Error Logs**
   - Sentry integration for error tracking
   - Real-time error alerts
   - Stack traces and context

#### Log Levels

- **ERROR**: Application errors
- **WARN**: Warning conditions
- **INFO**: Informational messages
- **DEBUG**: Debug information (development only)

## User Management

### Creating Users

1. **Manual Creation**
   - Navigate to "Admin" → "Users" → "Create"
   - Enter user details:
     - Email address
     - Full name
     - Role (ADMIN, MANAGER, USER, VIEWER)
     - Initial password (user will be prompted to change)
   - Click "Create User"

2. **Bulk Import**
   - Navigate to "Admin" → "Users" → "Import"
   - Download CSV template
   - Fill template with user data
   - Upload CSV file
   - Review and confirm import

3. **Self-Registration**
   - Users can register themselves
   - Default role: USER
   - ADMIN approval required for MANAGER/ADMIN roles
   - Configure in system settings

### Managing User Roles

#### Role Hierarchy

```
ADMIN (Full access)
  ↓
MANAGER (Operational management)
  ↓
USER (Standard operations)
  ↓
VIEWER (Read-only access)
```

#### Changing Roles

1. **Individual User**
   - Navigate to user details
   - Click "Edit Role"
   - Select new role
   - Save changes

2. **Bulk Role Changes**
   - Select multiple users
   - Click "Bulk Actions" → "Change Role"
   - Select target role
   - Confirm changes

#### Role Permissions Matrix

| Permission | VIEWER | USER | MANAGER | ADMIN |
|------------|--------|------|---------|-------|
| View stock | ✓ | ✓ | ✓ | ✓ |
| View reports | ✓ | ✓ | ✓ | ✓ |
| Create movements | ✗ | ✓ | ✓ | ✓ |
| Approve adjustments | ✗ | ✗ | ✓ | ✓ |
| Generate documents | ✗ | ✓ | ✓ | ✓ |
| Manage users | ✗ | ✗ | Partial | ✓ |
| System configuration | ✗ | ✗ | ✗ | ✓ |
| Audit logs | ✗ | ✗ | Partial | ✓ |

### User Account Management

#### Account Status

- **Active**: Normal operation
- **Disabled**: Cannot login, data preserved
- **Locked**: Temporary lock due to failed attempts
- **Expired**: Password expired, requires reset

#### Common Operations

1. **Reset Password**
   - Navigate to user details
   - Click "Reset Password"
   - Generate temporary password
   - User receives email with reset link

2. **Disable Account**
   - Navigate to user details
   - Click "Disable Account"
   - Provide reason (optional)
   - Account immediately disabled

3. **Enable Account**
   - Navigate to disabled users list
   - Select user
   - Click "Enable Account"
   - Account restored with same permissions

4. **Delete Account**
   - Navigate to user details
   - Click "Delete Account"
   - Confirm deletion
   - **Warning**: Irreversible, data anonymized

#### Session Management

1. **Active Sessions**
   - View all active user sessions
   - See login time, IP address, user agent
   - Force logout individual sessions

2. **Session Policies**
   - Configure session timeout (default: 24 hours)
   - Set maximum concurrent sessions
   - Enable/disable remember me feature

## System Configuration

### Application Settings

#### General Settings

1. **Company Information**
   - Company name
   - Logo upload
   - Contact information
   - Address details

2. **Business Rules**
   - Working hours
   - Default warehouse
   - Currency settings
   - Measurement units

3. **Notification Settings**
   - Email templates
   - Notification triggers
   - Recipient lists
   - Delivery schedules

#### Security Settings

1. **Password Policy**
   - Minimum length (default: 8)
   - Complexity requirements
   - Expiration period (default: 90 days)
   - History retention (prevent reuse)

2. **Authentication**
   - Session timeout
   - Maximum login attempts
   - Lockout duration
   - Two-factor authentication (optional)

3. **API Security**
   - Rate limiting thresholds
   - CORS configuration
   - API key management
   - Webhook security

### Database Configuration

#### Connection Settings

```env
# PostgreSQL
DATABASE_URL=postgresql://user:password@host:5432/database
DATABASE_POOL_SIZE=10
DATABASE_TIMEOUT=5000

# Redis
REDIS_URL=redis://host:6379
REDIS_PASSWORD=optional
REDIS_TLS=false
```

#### Performance Tuning

1. **Connection Pool**
   - Default: 10 connections
   - Increase for high traffic
   - Monitor connection usage

2. **Query Timeout**
   - Default: 5 seconds
   - Adjust based on query complexity
   - Set per-query timeouts for reports

3. **Caching Strategy**
   - Redis cache duration
   - Cache invalidation rules
   - Memory limits

### Email Configuration

#### SMTP Settings

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=username
SMTP_PASSWORD=password
SMTP_FROM=noreply@hay2010.com
SMTP_SECURE=true
```

#### Email Templates

1. **System Emails**
   - Welcome email
   - Password reset
   - Account locked
   - Security alerts

2. **Business Emails**
   - Low stock notifications
   - Report delivery
   - Document notifications
   - Audit summaries

3. **Customization**
   - Branding (logo, colors)
   - Footer text
   - Legal disclaimers
   - Contact information

## Monitoring & Maintenance

### Performance Monitoring

#### Key Metrics

1. **Application Metrics**
   - Request rate
   - Response times
   - Error rates
   - Memory usage

2. **Database Metrics**
   - Connection count
   - Query performance
   - Lock contention
   - Disk usage

3. **Business Metrics**
   - Stock movements per hour
   - Document generation time
   - User activity
   - System utilization

#### Monitoring Tools

1. **Prometheus/Grafana**
   - Pre-configured dashboards
   - Custom metrics collection
   - Alerting rules
   - Historical data

2. **Application Logs**
   - Structured JSON format
   - Correlation IDs
   - Performance tracing
   - Error tracking

3. **External Monitoring**
   - Uptime monitoring
   - SSL certificate monitoring
   - DNS monitoring
   - Third-party integrations

### Maintenance Tasks

#### Daily Tasks

1. **Health Checks**
   - Verify all services running
   - Check disk space
   - Review error logs
   - Monitor performance metrics

2. **Backup Verification**
   - Confirm backups completed
   - Test restore procedure
   - Verify backup integrity
   - Update backup logs

#### Weekly Tasks

1. **Performance Review**
   - Analyze slow queries
   - Review cache hit rates
   - Check connection pool usage
   - Optimize database indexes

2. **Security Review**
   - Review audit logs
   - Check for suspicious activity
   - Update security patches
   - Review user access

#### Monthly Tasks

1. **System Updates**
   - Apply security patches
   - Update dependencies
   - Database maintenance
   - Performance tuning

2. **Data Cleanup**
   - Archive old data
   - Purge temporary files
   - Optimize database tables
   - Update statistics

### Alert Configuration

#### Alert Levels

1. **Critical** (Immediate action required)
   - Service downtime
   - Database unavailable
   - Security breach
   - Data corruption

2. **Warning** (Attention required)
   - High resource usage
   - Slow performance
   - Backup failures
   - Security warnings

3. **Info** (For awareness)
   - Maintenance windows
   - User activity spikes
   - System updates
   - Configuration changes

#### Alert Channels

- **Email**: System administrators
- **SMS**: On-call staff
- **Slack/Teams**: Operations channel
- **PagerDuty**: Critical alerts

## Security Management

### Access Control

#### Principle of Least Privilege

1. **User Roles**
   - Assign minimum required permissions
   - Regular permission reviews
   - Temporary elevation when needed
   - Document all permission changes

2. **API Access**
   - Rate limiting per endpoint
   - IP whitelisting for admin APIs
   - API key rotation
   - Access logging

#### Audit Trail

1. **What's Logged**
   - All login attempts (success/failure)
   - User role changes
   - Data modifications
   - Configuration changes
   - Security events

2. **Retention Policy**
   - 90 days: Standard audit logs
   - 1 year: Security events
   - 7 years: Financial transactions
   - Permanent: User account changes

### Security Hardening

#### Application Security

1. **Input Validation**
   - All user inputs validated
   - SQL injection prevention
   - XSS protection
   - File upload restrictions

2. **Output Encoding**
   - HTML entity encoding
   - URL encoding
   - JavaScript encoding
   - CSS encoding

3. **Session Security**
   - HTTP-only cookies
   - Secure flag (HTTPS only)
   - SameSite attribute
   - Session fixation protection

#### Infrastructure Security

1. **Network Security**
   - Firewall configuration
   - VPN access for admin
   - DDoS protection
   - Network segmentation

2. **Server Security**
   - OS hardening
   - Regular security updates
   - Intrusion detection
   - File integrity monitoring

### Security Monitoring

#### Real-time Monitoring

1. **Intrusion Detection**
   - Failed login attempts
   - Brute force attacks
   - Suspicious IP addresses
   - Unusual access patterns

2. **Anomaly Detection**
   - Unusual data access
   - Abnormal transaction volumes
   - Geographic anomalies
   - Time-based anomalies

#### Security Reports

1. **Daily Security Summary**
   - Failed login attempts
   - Security events
   - System changes
   - Compliance status

2. **Weekly Security Review**
   - Vulnerability assessment
   - Access review
   - Policy compliance
   - Incident response

## Backup & Recovery

### Backup Strategy

#### Backup Types

1. **Full Backup**
   - Complete database dump
   - Application configuration
   - User uploads
   - Log files

2. **Incremental Backup**
   - Changes since last backup
   - Transaction logs
   - Binary logs
   - File changes

3. **Snapshot Backup**
   - Point-in-time recovery
   - Filesystem snapshots
   - Database snapshots
   - Application state

#### Backup Schedule

- **Hourly**: Transaction logs
- **Daily**: Incremental backups
- **Weekly**: Full backups
- **Monthly**: Archive backups

### Recovery Procedures

#### Data Recovery

1. **Point-in-Time Recovery**
   - Select recovery point
   - Restore full backup
   - Apply transaction logs
   - Verify data consistency

2. **Partial Recovery**
   - Restore specific tables
   - Recover deleted records
   - Fix data corruption
   - Merge with live data

#### Disaster Recovery

1. **Service Recovery**
   - Infrastructure failure
   - Data center outage
   - Network failure
   - Cloud provider issues

2. **Business Continuity**
   - Alternate site activation
   - Manual processes
   - Communication plan
   - Recovery time objectives

### Backup Verification

#### Automated Verification

1. **Integrity Checks**
   - Backup file checksums
   - Database consistency
   - File integrity
   - Restoration tests

2. **Validation Tests**
   - Sample data verification
   - Application functionality
   - Performance testing
   - Security validation

#### Manual Verification

1. **Monthly Tests**
   - Full restoration test
   - Performance verification
   - Data accuracy check
   - Documentation review

2. **Quarterly Drills**
   - Disaster recovery drill
   - Team coordination
   - Communication testing
   - Procedure validation

## Troubleshooting

### Common Issues

#### Database Issues

**Issue**: Database connection failures
**Diagnosis**:
```bash
# Check PostgreSQL service
systemctl status postgresql

# Test connection
pg_isready -h localhost -p 5432

# Check logs
tail -f /var/log/postgresql/postgresql-14-main.log
```

**Solutions**:
1. Restart PostgreSQL service
2. Check disk space
3. Verify connection string
4. Review connection limits

**Issue**: Slow database queries
**Diagnosis**:
```sql
-- Check slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

**Solutions**:
1. Add missing indexes
2. Optimize query patterns
3. Increase connection pool
4. Archive old data

#### Redis Issues

**Issue**: Redis connection failures
**Diagnosis**:
```bash
# Check Redis service
systemctl status redis-server

# Test connection
redis-cli ping

# Check memory usage
redis-cli info memory
```

**Solutions**:
1. Restart Redis service
2. Increase memory limits
3. Clear old cache data
4. Check network connectivity

**Issue**: High Redis memory usage
**Diagnosis**:
```bash
# Analyze memory usage
redis-cli info memory | grep used_memory_human

# List large keys
redis-cli --bigkeys
```

**Solutions**:
1. Set appropriate TTL values
2. Implement cache eviction policies
3. Use Redis clustering
4. Monitor cache hit rates

#### Application Issues

**Issue**: High memory usage
**Diagnosis**:
```bash
# Check Node.js memory
ps aux | grep node

# Monitor with pm2
pm2 monit
```

**Solutions**:
1. Increase Node.js memory limit
2. Optimize application code
3. Implement connection pooling
4. Add application restart policies

**Issue**: Slow response times
**Diagnosis**:
1. Check application logs for slow operations
2. Monitor database query performance
3. Review external API calls
4. Check network latency

**Solutions**:
1. Implement caching
2. Optimize database queries
3. Use CDN for static assets
4. Load balance traffic

### Performance Tuning

#### Database Tuning

1. **Index Optimization**
   - Analyze query patterns
   - Add missing indexes
   - Remove unused indexes
   - Regular index maintenance

2. **Query Optimization**
   - Use EXPLAIN ANALYZE
   - Optimize JOIN operations
   - Implement pagination
   - Use materialized views

3. **Connection Management**
   - Optimal pool size
   - Connection timeout settings
   - Connection reuse
   - Connection monitoring

#### Application Tuning

1. **Memory Management**
   - Garbage collection tuning
   - Memory leak detection
   - Cache optimization
   - Stream processing

2. **Concurrency Management**
   - Worker thread configuration
   - Event loop optimization
   - Async/await patterns
   - Batch processing

3. **Caching Strategy**
   - Cache hierarchy (L1/L2)
   - Cache invalidation
   - Cache warming
   - Cache monitoring

### Emergency Procedures

#### Service Outage

1. **Immediate Actions**
   - Notify stakeholders
   - Activate backup team
   - Begin troubleshooting
   - Document timeline

2. **Recovery Steps**
   - Identify root cause
   - Implement fix
   - Verify restoration
   - Monitor stability

3. **Post-Mortem**
   - Document incident
   - Identify improvements
   - Update procedures
   - Communicate resolution

#### Data Corruption

1. **Containment**
   - Isolate affected systems
   - Stop data modifications
   - Backup current state
   - Notify stakeholders

2. **Recovery**
   - Restore from backup
   - Apply transaction logs
   - Verify data integrity
   - Resume operations

3. **Prevention**
   - Implement additional checks
   - Update backup procedures
   - Add data validation
   - Schedule integrity checks

### Support Resources

#### Internal Resources

1. **Documentation**
   - This admin guide
   - Technical architecture
   - Runbooks and procedures
   - Knowledge base

2. **Tools**
   - Monitoring dashboards
   - Log analysis tools
   - Performance monitoring
   - Security scanners

#### External Resources

1. **Vendor Support**
   - PostgreSQL support
   - Redis support
   - Next.js community
   - Cloud provider support

2. **Professional Services**
   - Database consultants
   - Security auditors
   - Performance experts
   - Disaster recovery specialists

#### Emergency Contacts

- **Primary Admin**: [Name] - [Phone] - [Email]
- **Secondary Admin**: [Name] - [Phone] - [Email]
- **Infrastructure Team**: [Contact]
- **Security Team**: [Contact]
- **Vendor Support**: [Contact]