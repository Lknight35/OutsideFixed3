import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Clean up existing data
  await prisma.user.deleteMany()

  // Create a test user
  const testUser = await prisma.user.create({
    data: {
      email: 'demo@showforge.local',
      name: 'Demo User',
    },
  })

  console.log(`Created test user: ${testUser.email}`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
