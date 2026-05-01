import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { prisma } from '../lib/db/prisma'

async function main() {
  const u = await prisma.user.findFirst({ where: { email: 'admin@hay2010.com' } })
  if (!u) throw new Error('Admin user not found')

  const k = await prisma.apiKey.create({
    data: {
      userId: u.id,
      name: 'Test key',
      keyPrefix: 'hay2010_sk_l',
      keyHash: '52fb2de5a959353a8359eb3dcb32f227685efa5d0b3017e3d005a4e25d6cbe9c',
      role: 'ADMIN',
    },
  })

  console.log(JSON.stringify({
    keyId: k.id,
    apiKey: 'hay2010_sk_live_cabd1fc1937b9f4fffa4a39f59ab8149',
  }))
  await prisma.$disconnect()
}

main().catch(console.error)
