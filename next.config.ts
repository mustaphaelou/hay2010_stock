import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: [
      "recharts",
      "@hugeicons/core-free-icons",
      "@hugeicons/react",
      "@base-ui/react",
      "@tanstack/react-table",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/modifiers",
      "@dnd-kit/utilities",
      "class-variance-authority",
      "clsx",
      "tailwind-merge",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-avatar",
      "@radix-ui/react-separator",
      "@radix-ui/react-toggle",
      "@radix-ui/react-toggle-group",
      "zod",
    ],
  },
  output: 'standalone',
};

export default nextConfig;
