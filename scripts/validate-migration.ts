import 'dotenv/config'
import { config } from 'dotenv'
config({ path: '.env.local', override: true })

import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { PrismaClient } from '@/lib/generated/prisma/client'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function validateMigration() {
  console.log('🔍 Validating database migration...\n')

  const checks = [
    {
      name: 'Role enum values',
      query: async () => {
        const result = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
          SELECT enumlabel FROM pg_enum 
          WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Role')
          ORDER BY enumsortorder
        `
const roles = result.map((r: { enumlabel: string }) => r.enumlabel)
		const expected = ['ADMIN', 'MANAGER', 'USER', 'VIEWER']
		const validationResult: { pass: boolean; expected?: string[]; actual?: string[] } = {
			pass: JSON.stringify(roles) === JSON.stringify(expected),
			actual: roles,
			expected,
		}
		return validationResult
      },
    },
    {
      name: 'TypePartenaire enum exists',
      query: async () => {
        const result = await prisma.$queryRaw<Array<{ exists: boolean }>>`
          SELECT EXISTS (
            SELECT 1 FROM pg_type WHERE typname = 'TypePartenaire'
          ) as exists
        `
        return { pass: (result[0] as { exists: boolean }).exists } as { pass: boolean }
      },
    },
    {
      name: 'All tables exist',
      query: async () => {
        const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
          SELECT table_name FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
          ORDER BY table_name
        `
        const expectedTables = [
          'users',
          'partenaires',
          'categories_produits',
          'entrepots',
          'produits',
          'tarifs_fournisseurs',
          'niveaux_stock',
          'affaires',
          'documents',
          'lignes_documents',
          'historique_prix_achats',
          'mouvements_stock',
          'lots_serie',
          'tarifs_exceptionnels',
          '_prisma_migrations',
        ]
        const actualTables = (tables as { table_name: string }[]).map(t => t.table_name)
        const missing = expectedTables.filter(t => !actualTables.includes(t))
        return { pass: missing.length === 0, missing }
      },
    },
    {
      name: 'Foreign key constraints',
      query: async () => {
        const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count
          FROM information_schema.table_constraints
          WHERE constraint_type = 'FOREIGN KEY'
          AND table_schema = 'public'
        `
const count = Number((result[0] as { count: bigint }).count)
		return { pass: count >= 10, actual: count } as { pass: boolean; actual?: number }
      },
    },
    {
      name: 'Database connection',
      query: async () => {
        const result = await prisma.$queryRaw<Array<{ test: number }>>`SELECT 1 as test`
        return { pass: (result[0] as { test: number }).test === 1 } as { pass: boolean }
      },
    },
  ]

  let passed = 0
  let failed = 0

  for (const check of checks) {
    try {
      const result = await check.query() as { pass: boolean; expected?: unknown; actual?: unknown; missing?: string[] }
      if (result.pass) {
        console.log(`✅ ${check.name}: PASS`)
        passed++
      } else {
        console.log(`❌ ${check.name}: FAIL`)
        if (result.expected) {
          console.log(`   Expected: ${JSON.stringify(result.expected)}`)
        }
        if (result.actual) {
          console.log(`   Actual: ${JSON.stringify(result.actual)}`)
        }
        if (result.missing) {
          console.log(`   Missing: ${JSON.stringify(result.missing)}`)
        }
        failed++
      }
    } catch (error) {
      console.log(`❌ ${check.name}: ERROR`)
      console.log(`   ${error instanceof Error ? error.message : error}`)
      failed++
    }
  }

  console.log(`\n${'='.repeat(50)}`)
  console.log(`Results: ${passed} passed, ${failed} failed`)
  console.log(`${'='.repeat(50)}\n`)

  await prisma.$disconnect()
  process.exit(failed > 0 ? 1 : 0)
}

validateMigration()
