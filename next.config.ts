import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize package imports for faster dev boot and smaller bundles
  // Reference: https://vercel.com/blog/how-we-optimized-package-imports-in-next-js
  experimental: {
    optimizePackageImports: [
      // Chart library - heavy (~300KB)
      "recharts",
      // Icon libraries
      "@hugeicons/core-free-icons",
      "@hugeicons/react",
      // UI libraries
      "@base-ui/react",
      "@tanstack/react-table",
      // Drag and drop
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/modifiers",
      "@dnd-kit/utilities",
      // Styling utilities
      "class-variance-authority",
      "clsx",
      "tailwind-merge",
      // Radix UI primitives (used by Shadcn)
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-avatar",
      "@radix-ui/react-separator",
      "@radix-ui/react-toggle",
      "@radix-ui/react-toggle-group",
      // Validation
      "zod",
    ],
  },
  output: 'standalone',
};

export default nextConfig;
