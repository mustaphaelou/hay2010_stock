import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding database...')

  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@hay2010.com' }
  })

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 12)
    
    await prisma.user.create({
      data: {
        email: 'admin@hay2010.com',
        password: hashedPassword,
        name: 'Admin',
        role: 'ADMIN'
      }
    })
    console.log('Created admin user')
  } else {
    console.log('Admin user already exists')
  }

  const existingWarehouse = await prisma.entrepot.findFirst({
    where: { code_entrepot: 'ENT-001' }
  })

  if (!existingWarehouse) {
    await prisma.entrepot.create({
      data: {
        code_entrepot: 'ENT-001',
        nom_entrepot: 'Entrepôt Principal',
        adresse_entrepot: 'Adresse principale',
        ville_entrepot: 'Casablanca',
        est_actif: true,
        est_entrepot_principal: true
      }
    })
    console.log('Created main warehouse')
  } else {
    console.log('Main warehouse already exists')
  }

  const categories = [
    { code_categorie: 'CAT-001', nom_categorie: 'Informatique' },
    { code_categorie: 'CAT-002', nom_categorie: 'Bureautique' },
    { code_categorie: 'CAT-003', nom_categorie: 'Électronique' }
  ]

  for (const cat of categories) {
    const existing = await prisma.categorieProduit.findUnique({
      where: { code_categorie: cat.code_categorie }
    })
    
    if (!existing) {
      await prisma.categorieProduit.create({ data: cat })
      console.log(`Created category: ${cat.nom_categorie}`)
    }
  }

  console.log('Seeding completed!')
}

main()
  .catch((e) => {
    console.error('Seeding error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
