const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function checkPasswords() {
  console.log('=== Checking Passwords in Database ===\n')
  
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      password: true,
      role: true,
    },
    take: 5,
  })
  
  console.log(`Found ${users.length} users in database:\n`)
  
  for (const user of users) {
    const isHashed = /^\$2[aby]\$/.test(user.password)
    const preview = user.password.substring(0, 30)
    const preview2 = user.password.substring(30, 60)
    
    console.log(`User: ${user.name}`)
    console.log(`  Email: ${user.email}`)
    console.log(`  Role: ${user.role}`)
    console.log(`  Password Hashed: ${isHashed ? '✅ YES' : '❌ NO'}`)
    console.log(`  Hash Preview: ${preview}${preview2 ? preview2 + '...' : ''}`)
    console.log()
  }
  
  // Count all users and how many have hashed passwords
  const allUsers = await prisma.user.findMany({
    select: { password: true },
  })
  const hashedCount = allUsers.filter(u => /^\$2[aby]\$/.test(u.password)).length
  
  console.log(`\n=== Summary ===`)
  console.log(`Total users: ${allUsers.length}`)
  console.log(`Hashed passwords: ${hashedCount}`)
  console.log(`Plain text passwords: ${allUsers.length - hashedCount}`)
  
  await prisma.$disconnect()
}

checkPasswords().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})