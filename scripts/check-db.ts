import 'dotenv/config'
import { config } from 'dotenv'
config({ path: '.env.local', override: true })

import { Pool } from 'pg'

async function checkDatabase() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  
  try {
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)
    console.log('\n📊 Tables in database:')
    tables.rows.forEach(r => console.log(`  - ${r.table_name}`))
    
    const usersSchema = await pool.query(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `)
    console.log('\n👥 Users table columns:')
    usersSchema.rows.forEach(r => console.log(`  - ${r.column_name}: ${r.data_type} (${r.udt_name})`))
    
    const enums = await pool.query(`
      SELECT t.typname as enum_name, e.enumlabel as enum_value
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      ORDER BY t.typname, e.enumsortorder
    `)
    console.log('\n🔤 Enums in database:')
    let currentEnum = ''
    enums.rows.forEach(r => {
      if (r.enum_name !== currentEnum) {
        currentEnum = r.enum_name
        console.log(`  ${currentEnum}:`)
      }
      console.log(`    - ${r.enum_value}`)
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await pool.end()
  }
}

checkDatabase()
