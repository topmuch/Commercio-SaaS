import { hashPassword } from '../src/lib/auth'
import { db } from '../src/lib/db'

console.log('🔐 Creating Test User for Login Testing')
console.log('═════════════════════════════════════════════════\n')

// Test user credentials
const TEST_EMAIL = 'password-test@distribusn.com'
const TEST_PASSWORD = 'TestUser123!'
const TEST_NAME = 'Password Test User'
const COMPANY_ID = 'comp_1'

// Delete existing test user if exists
try {
  await db.user.deleteMany({
    where: { email: TEST_EMAIL },
  })
  console.log('✅ Cleaned up any existing test user\n')
} catch {
  // User doesn't exist, which is fine
}

// Create test user with hashed password
const hashedPassword = await hashPassword(TEST_PASSWORD)

const testUser = await db.user.create({
  data: {
    email: TEST_EMAIL,
    name: TEST_NAME,
    password: hashedPassword,
    role: 'commercial',
    active: true,
    companyId: COMPANY_ID,
    phone: '+221 77 000 00 00',
  },
})

console.log('✅ Test user created successfully!')
console.log('═════════════════════════════════════════════════\n')
console.log('📋 Login Credentials for Testing:')
console.log(`   Email:    ${TEST_EMAIL}`)
console.log(`   Password: ${TEST_PASSWORD}`)
console.log(`   User ID:  ${testUser.id}`)
console.log(`   Company:  ${COMPANY_ID}`)
console.log('═════════════════════════════════════════════════\n')
console.log('💡 You can now test login at: http://localhost:3000/login')
console.log('═════════════════════════════════════════════════')

await db.$disconnect()