// Prisma configuration file for Prisma v7+
// The datasource URL is configured here instead of in schema.prisma
import "dotenv/config";
import { defineConfig } from "prisma/config";

// Also load .env.local for local development  
import { config } from "dotenv";
config({ path: ".env.local", override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
