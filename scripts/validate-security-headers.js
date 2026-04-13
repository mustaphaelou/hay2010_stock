#!/usr/bin/env node

/**
 * Security Headers Validation Script
 * 
 * Validates that security headers are properly configured in the application.
 * This script can be run as part of CI/CD pipeline to ensure security compliance.
 */

const https = require('https')
const http = require('http')
const { URL } = require('url')

const REQUIRED_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-DNS-Prefetch-Control': 'on',
  'Expect-CT': 'max-age=86400, enforce',
}

const CSP_REQUIRED_DIRECTIVES = [
  "default-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'"
]

const CSP_FORBIDDEN_DIRECTIVES = [
  "unsafe-inline",
  "unsafe-eval"
]

function validateSecurityHeaders(url, headers) {
  console.log(`\n🔒 Validating security headers for: ${url}`)
  console.log('=' .repeat(60))

  const issues = []
  const warnings = []

  // Check required headers
  for (const [header, expectedValue] of Object.entries(REQUIRED_HEADERS)) {
    const actualValue = headers[header.toLowerCase()]
    
    if (!actualValue) {
      issues.push(`❌ Missing required header: ${header}`)
    } else if (expectedValue && !actualValue.includes(expectedValue)) {
      warnings.push(`⚠️  Header ${header} has unexpected value: ${actualValue} (expected: ${expectedValue})`)
    } else {
      console.log(`✅ ${header}: ${actualValue}`)
    }
  }

  // Validate Content-Security-Policy
  const cspHeader = headers['content-security-policy']
  if (!cspHeader) {
    issues.push('❌ Missing Content-Security-Policy header')
  } else {
    console.log(`✅ Content-Security-Policy: ${cspHeader.substring(0, 100)}...`)
    
    // Check for required directives
    for (const directive of CSP_REQUIRED_DIRECTIVES) {
      if (!cspHeader.includes(directive)) {
        warnings.push(`⚠️  CSP missing directive: ${directive}`)
      }
    }

    // Check for forbidden directives in production
    if (process.env.NODE_ENV === 'production' || url.includes('production')) {
      for (const directive of CSP_FORBIDDEN_DIRECTIVES) {
        if (cspHeader.includes(directive)) {
          issues.push(`❌ CSP contains forbidden directive in production: ${directive}`)
        }
      }
    }
  }

  // Check for missing security headers
  const missingHeaders = Object.keys(REQUIRED_HEADERS).filter(
    header => !headers[header.toLowerCase()]
  )

  if (missingHeaders.length > 0) {
    issues.push(`❌ Missing headers: ${missingHeaders.join(', ')}`)
  }

  // Print results
  if (issues.length > 0) {
    console.log('\n🚨 Security Issues Found:')
    issues.forEach(issue => console.log(issue))
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  Security Warnings:')
    warnings.forEach(warning => console.log(warning))
  }

  if (issues.length === 0 && warnings.length === 0) {
    console.log('\n🎉 All security headers are properly configured!')
  }

  return {
    passed: issues.length === 0,
    issues,
    warnings,
    headers: Object.keys(headers).filter(key => 
      key.startsWith('x-') || 
      key.includes('security') || 
      key.includes('policy')
    ).reduce((obj, key) => {
      obj[key] = headers[key]
      return obj
    }, {})
  }
}

function fetchHeaders(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url)
    const protocol = parsedUrl.protocol === 'https:' ? https : http
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'HEAD',
      headers: {
        'User-Agent': 'Security-Header-Validator/1.0'
      },
      timeout: 10000
    }

    const req = protocol.request(options, (res) => {
      const headers = {}
      for (const [key, value] of Object.entries(res.headers)) {
        headers[key.toLowerCase()] = value
      }
      resolve(headers)
    })

    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })

    req.end()
  })
}

async function main() {
  const urls = process.argv.slice(2)
  
  if (urls.length === 0) {
    console.log('Usage: node validate-security-headers.js <url1> <url2> ...')
    console.log('Example: node validate-security-headers.js http://localhost:3000 https://example.com')
    process.exit(1)
  }

  const results = []
  let hasFailures = false

  for (const url of urls) {
    try {
      console.log(`\n📡 Fetching headers from: ${url}`)
      const headers = await fetchHeaders(url)
      const result = validateSecurityHeaders(url, headers)
      results.push({ url, ...result })
      
      if (!result.passed) {
        hasFailures = true
      }
    } catch (error) {
      console.error(`\n❌ Failed to fetch headers from ${url}:`, error.message)
      results.push({ 
        url, 
        passed: false, 
        error: error.message,
        issues: [`Failed to fetch headers: ${error.message}`]
      })
      hasFailures = true
    }
  }

  // Generate summary report
  console.log('\n' + '='.repeat(60))
  console.log('📊 SECURITY HEADERS VALIDATION SUMMARY')
  console.log('='.repeat(60))

  let totalPassed = 0
  let totalIssues = 0
  let totalWarnings = 0

  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.url}`)
    console.log(`   Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`)
    
    if (result.issues && result.issues.length > 0) {
      console.log(`   Issues: ${result.issues.length}`)
      totalIssues += result.issues.length
    }
    
    if (result.warnings && result.warnings.length > 0) {
      console.log(`   Warnings: ${result.warnings.length}`)
      totalWarnings += result.warnings.length
    }
    
    if (result.passed) {
      totalPassed++
    }
  })

  console.log('\n' + '='.repeat(60))
  console.log(`Total URLs: ${results.length}`)
  console.log(`Passed: ${totalPassed}`)
  console.log(`Failed: ${results.length - totalPassed}`)
  console.log(`Total Issues: ${totalIssues}`)
  console.log(`Total Warnings: ${totalWarnings}`)
  console.log('='.repeat(60))

  // Exit with appropriate code
  if (hasFailures) {
    console.log('\n🚨 Security validation failed!')
    process.exit(1)
  } else {
    console.log('\n🎉 All security checks passed!')
    process.exit(0)
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error)
  process.exit(1)
})

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('Script failed:', error)
    process.exit(1)
  })
}

module.exports = {
  validateSecurityHeaders,
  fetchHeaders
}