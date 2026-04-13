# User Guide

This guide provides instructions for users of the HAY2010 Stock Management Application.

## Table of Contents

1. [Getting Started](#getting-started)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Stock Management](#stock-management)
4. [Document Generation](#document-generation)
5. [Reporting & Analytics](#reporting--analytics)
6. [Troubleshooting](#troubleshooting)

## Getting Started

### Account Creation

1. **Registration**
   - Navigate to the registration page
   - Enter your email, name, and password
   - Select your role (USER or VIEWER)
   - Click "Register"

2. **Login**
   - Go to the login page
   - Enter your email and password
   - Click "Login"
   - You will be redirected to the dashboard

3. **Password Reset**
   - Click "Forgot Password" on the login page
   - Enter your email address
   - Check your email for reset instructions
   - Follow the link to create a new password

### Dashboard Overview

The dashboard provides an overview of key metrics:

- **Total Stock Value**: Current value of all inventory
- **Low Stock Items**: Products below minimum quantity
- **Recent Movements**: Latest stock transactions
- **Pending Documents**: Documents awaiting processing
- **Quick Actions**: Common operations

## User Roles & Permissions

### Role Overview

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| **VIEWER** | Read-only access | View stock levels, View reports, Export data |
| **USER** | Standard operations | All VIEWER permissions, Create stock movements, Generate basic documents |
| **MANAGER** | Operational management | All USER permissions, Approve stock adjustments, Generate all documents, Manage users (except ADMIN) |
| **ADMIN** | Full system access | All permissions, User management, System configuration, Audit logs |

### Changing Roles

- Only ADMIN users can change user roles
- Contact your system administrator for role changes
- Role changes take effect immediately

## Stock Management

### Viewing Stock Levels

1. **Stock Overview**
   - Navigate to "Stock" → "Overview"
   - View all products with current quantities
   - Filter by warehouse, product category, or status
   - Sort by quantity, product name, or last updated

2. **Product Details**
   - Click on any product to view details
   - See current quantity across all warehouses
   - View movement history
   - Check reorder points and supplier information

3. **Low Stock Alerts**
   - Products below minimum quantity are highlighted in red
   - Alert appears on dashboard
   - Email notifications can be configured

### Stock Movements

#### Creating a Movement

1. **Navigate to "Stock" → "Movements" → "New"**
2. **Select Movement Type:**
   - **INBOUND**: Receiving goods from suppliers
   - **OUTBOUND**: Shipping goods to customers
   - **ADJUSTMENT**: Correcting inventory counts

3. **Enter Movement Details:**
   - Product (required)
   - Warehouse (required)
   - Quantity (positive for inbound, negative for outbound)
   - Reference number (PO number, invoice number, etc.)
   - Notes (optional)

4. **Submit Movement:**
   - Click "Submit"
   - System validates available stock for outbound movements
   - Movement is recorded and stock levels updated
   - Confirmation message displayed

#### Movement Approval

- **USER**: Movements are auto-approved
- **MANAGER**: Can approve/reject adjustments
- **ADMIN**: All movements are auto-approved

### Stock Adjustments

Use adjustments to correct inventory discrepancies:

1. **Physical Count**: Perform regular physical inventory counts
2. **Enter Adjustment**: Create adjustment movement with difference
3. **Documentation**: Attach count sheets or explanation
4. **Approval**: MANAGER or ADMIN approval required for large adjustments

## Document Generation

### Available Documents

1. **Stock Reports**
   - Current inventory levels
   - Low stock alerts
   - Movement history
   - Valuation reports

2. **Movement Documents**
   - Receiving reports (inbound)
   - Shipping manifests (outbound)
   - Adjustment reports

3. **Business Documents**
   - Invoices
   - Delivery notes
   - Purchase orders

### Generating Documents

1. **Select Document Type**
   - Navigate to "Documents" → "Generate"
   - Choose document type
   - Select template (if multiple available)

2. **Configure Document**
   - Select date range for reports
   - Choose products/warehouses
   - Add company logo and details
   - Set output format (PDF, Excel, CSV)

3. **Generate & Download**
   - Click "Generate"
   - Wait for processing (large reports may take time)
   - Download generated document
   - Document is saved to history

### Document Templates

- **Default Template**: Standard company format
- **Custom Templates**: Contact ADMIN for custom templates
- **Branding**: Company logo and colors automatically applied

## Reporting & Analytics

### Standard Reports

1. **Daily Stock Report**
   - Opening and closing balances
   - Daily movements summary
   - Value changes

2. **Monthly Inventory Report**
   - Month-end inventory valuation
   - Movement analysis
   - Turnover rates

3. **Supplier Performance**
   - Delivery timeliness
   - Quality metrics
   - Price analysis

### Custom Reports

1. **Report Builder**
   - Navigate to "Reports" → "Custom"
   - Select data fields
   - Apply filters and sorting
   - Choose visualization type (table, chart, graph)

2. **Scheduled Reports**
   - Set up automatic report generation
   - Choose frequency (daily, weekly, monthly)
   - Select recipients
   - Configure delivery method (email, download)

### Data Export

1. **Export Formats**
   - CSV (spreadsheet)
   - Excel (formatted)
   - PDF (printable)
   - JSON (API integration)

2. **Export Process**
   - Apply filters to data
   - Click "Export"
   - Select format
   - Download file

## Troubleshooting

### Common Issues

#### Login Problems

**Issue**: "Invalid credentials" error
**Solution**:
1. Check caps lock is off
2. Verify email spelling
3. Use password reset if forgotten
4. Contact ADMIN if account is locked

**Issue**: "Account not found" error
**Solution**:
1. Verify registration was completed
2. Check email for confirmation
3. Contact system administrator

#### Stock Movement Errors

**Issue**: "Insufficient stock" for outbound movement
**Solution**:
1. Check current stock levels
2. Verify product and warehouse selection
3. Consider partial shipment
4. Create purchase order for restocking

**Issue**: Movement not appearing in reports
**Solution**:
1. Check movement approval status
2. Verify date range in reports
3. Refresh browser cache
4. Contact MANAGER if approval pending

#### Document Generation Issues

**Issue**: PDF generation fails
**Solution**:
1. Check internet connection
2. Reduce report size (fewer products/date range)
3. Try different browser
4. Contact support if persistent

**Issue**: Incorrect data in reports
**Solution**:
1. Verify movement dates
2. Check product selections
3. Confirm warehouse assignments
4. Report bug to ADMIN

### Performance Tips

1. **Browser Recommendations**
   - Use Chrome, Firefox, or Edge (latest versions)
   - Clear cache regularly
   - Disable unnecessary extensions

2. **Report Optimization**
   - Use filters to reduce data volume
   - Schedule large reports for off-hours
   - Export to CSV for large datasets

3. **Navigation Tips**
   - Use keyboard shortcuts (shown with ⌘ symbol)
   - Bookmark frequently used pages
   - Use search functionality

### Getting Help

1. **System Documentation**
   - Click "Help" in top navigation
   - Access user guides and tutorials
   - View FAQ section

2. **Contact Support**
   - **Email**: support@hay2010.com
   - **Phone**: [Support phone number]
   - **Hours**: Monday-Friday, 9AM-5PM

3. **Feature Requests**
   - Submit via "Help" → "Feature Request"
   - Describe business need
   - Include examples if possible

## Keyboard Shortcuts

| Shortcut | Action | Available For |
|----------|--------|---------------|
| `Ctrl + /` | Search | All pages |
| `Ctrl + N` | New movement | Stock pages |
| `Ctrl + D` | Generate document | Document pages |
| `Ctrl + E` | Export data | Report pages |
| `Ctrl + S` | Save/Search | Forms |
| `Esc` | Cancel/Close | Modals, forms |

## Mobile Access

### Mobile App
- Available on iOS and Android
- Scan QR code on login page
- Download from app stores

### Mobile Web
- Responsive design for all devices
- Touch-optimized interface
- Offline capability for basic functions

### Mobile Limitations
- Document generation limited to smaller reports
- Some advanced features desktop-only
- Upload/download speeds may vary

## Security Best Practices

### Account Security
1. **Password Management**
   - Use strong, unique passwords
   - Change password every 90 days
   - Don't share passwords
   - Use password manager if available

2. **Session Management**
   - Log out when not using
   - Don't use public computers
   - Enable auto-logout if available
   - Report suspicious activity

### Data Security
1. **Data Export**
   - Secure exported files
   - Don't email sensitive data
   - Use encrypted storage
   - Follow company data policies

2. **Access Control**
   - Only access needed data
   - Don't share login credentials
   - Report access violations
   - Follow least privilege principle

## Updates & Maintenance

### System Updates
- Regular updates every month
- Maintenance windows announced 72 hours in advance
- Updates typically on weekends
- No data loss during updates

### New Features
- Feature announcements via email
- Training sessions for major updates
- Feedback collected after rollout
- Rollback option for critical issues

### Data Backup
- Automatic daily backups
- 30-day retention period
- Point-in-time recovery available
- Contact ADMIN for restore requests