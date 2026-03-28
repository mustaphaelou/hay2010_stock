import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // =====================================================
  // OUTPUT CONFIGURATION
  // =====================================================
  // Disabled standalone on Windows due to filename restrictions (colons in externals)
  output: process.env.STANDALONE_BUILD === 'true' || (process.env.NODE_ENV === 'production' && process.platform !== 'win32') 
    ? 'standalone' 
    : undefined,

  // =====================================================
  // IMAGE OPTIMIZATION
  // =====================================================
  images: {
    // Enable image optimization
    formats: ['image/avif', 'image/webp'],

    // Device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],

    // Image sizes for different use cases
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 512],

    // Minimum cache TTL for optimized images
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days

    // External image domains (if using CDN)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.hay2010.com',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: '*.cloudfront.net',
      },
    ],

    // Disable static image imports in development for faster builds
    unoptimized: process.env.NODE_ENV === 'development',
  },

  // =====================================================
  // COMPRESSION & PERFORMANCE
  // =====================================================
  compress: true,

  // =====================================================
  // EXPERIMENTAL FEATURES
  // =====================================================
  experimental: {
    // Optimize package imports to reduce bundle size
optimizePackageImports: [
    "recharts",
    "@hugeicons/core-free-icons",
    "@hugeicons/react",
    "@base-ui/react",
    "@dnd-kit/core",
    "@dnd-kit/sortable",
    "@dnd-kit/modifiers",
    "@dnd-kit/utilities",
    "class-variance-authority",
    "clsx",
    "tailwind-merge",
    "@radix-ui/react-dialog",
    "@radix-ui/react-popover",
    "@radix-ui/react-dropdown-menu",
    "@radix-ui/react-select",
    "@radix-ui/react-tabs",
    "@radix-ui/react-tooltip",
    "@radix-ui/react-avatar",
    "@radix-ui/react-separator",
    "@radix-ui/react-toggle",
    "@radix-ui/react-toggle-group",
    "lucide-react",
    "zod",
  ],

    // Server actions configuration
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  // =====================================================
  // HEADERS & CACHING
  // =====================================================
  async headers() {
    return [
      // Static assets - long cache
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Next.js static files
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Fonts
      {
        source: '/fonts/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
      // API routes - no cache
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
        ],
      },
      // Security headers for all routes
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
{
 key: 'Content-Security-Policy',
 value: process.env.NODE_ENV === 'development' ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https: ws: wss:; frame-ancestors 'none';" : "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';"
 },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
        ]
      }
    ]
  },

  // =====================================================
  // REDIRECTS & REWRITES
  // =====================================================
  async redirects() {
    return [
      // Redirect old routes if any
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ]
  },

  async rewrites() {
    return {
      // API rewrites for external services
      beforeFiles: [
        // Health check endpoint
        {
          source: '/health',
          destination: '/api/health',
        },
      ],
      afterFiles: [
        // CDN rewrite for static assets
        {
          source: '/cdn/:path*',
          destination: 'https://cdn.hay2010.com/:path*',
        },
      ],
    }
  },

  // =====================================================
  // ENVIRONMENT VARIABLES
  // =====================================================
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '1.0.0',
  },

  // =====================================================
  // TYPESCRIPT
  // =====================================================
  typescript: {
    // Only ignore build errors in development for faster iteration
    // Production builds should catch type errors
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },

  // =====================================================
  // LOGGING
  // =====================================================
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  // =====================================================
  // POWERED-BY HEADER
  // =====================================================
  poweredByHeader: false,
};

export default nextConfig;
